import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTournamentSchema, insertRegistrationSchema, InsertTournament } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
// Removed puppeteer - using HTML print solution instead
import rateLimit from "express-rate-limit";
import { v4 as uuidv4 } from "uuid";

// Session interface
declare module "express-session" {
  interface SessionData {
    isAuthenticated?: boolean;
    userId?: string;
  }
}

// Rate limiting
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting in development
    return process.env.NODE_ENV === 'development';
  }
});

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // More generous limit for admin routes
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting in development
    return process.env.NODE_ENV === 'development';
  }
});

// Authentication middleware
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.isAuthenticated) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
};

// File upload configuration with improved naming
const uploadDir = path.join(process.cwd(), 'uploads', 'receipts');

const createUploadDirectoryStructure = (date: Date) => {
  const year = date.getFullYear().toString();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const dayDir = path.join(uploadDir, year, dateStr);
  
  if (!fs.existsSync(dayDir)) {
    fs.mkdirSync(dayDir, { recursive: true });
  }
  
  return dayDir;
};

const storage_multer = multer.diskStorage({
  destination: (req, file, cb) => {
    const now = new Date();
    const dayDir = createUploadDirectoryStructure(now);
    cb(null, dayDir);
  },
  filename: (req, file, cb) => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD format
    const registrationId = uuidv4().substring(0, 8); // Short UUID
    const random8 = Math.random().toString(36).substring(2, 10); // 8 random chars
    const ext = path.extname(file.originalname);
    const filename = `${dateStr}-${registrationId}-${random8}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage_multer,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed.'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Apply rate limiter only to public API routes (exclude admin routes)
  app.use('/api', (req, res, next) => {
    if (req.path.startsWith('/admin')) {
      adminLimiter(req, res, next);
    } else {
      publicLimiter(req, res, next);
    }
  });

  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      // Check credentials (hardcoded as requested)
      if (username === 'admin' && password === 'fefwer4234FERF#@$$@#') {
        req.session.isAuthenticated = true;
        req.session.userId = username;
        res.json({ success: true, message: "Login successful" });
      } else {
        res.status(401).json({ error: "Invalid credentials" });
      }
    } catch (error) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.clearCookie('sessionId');
      res.json({ success: true, message: "Logout successful" });
    });
  });

  app.get("/api/auth/check", (req, res) => {
    res.json({ 
      isAuthenticated: !!req.session?.isAuthenticated,
      user: req.session?.userId || null 
    });
  });

  // Get all open tournaments
  app.get("/api/tournaments", async (req, res) => {
    try {
      const tournaments = await storage.getOpenTournaments();
      res.json(tournaments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tournaments" });
    }
  });

  // Get next tournament for countdown
  app.get("/api/tournaments/next", async (req, res) => {
    try {
      const nextTournament = await storage.getNextTournament();
      res.json(nextTournament);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch next tournament" });
    }
  });

  // Submit registration
  app.post("/api/registrations", upload.single('receiptFile'), async (req, res) => {
    try {
      const errors: string[] = [];

      // Manual validation with detailed error messages
      if (!req.body.name || req.body.name.trim().length < 2) {
        errors.push("Full name must be at least 2 characters long");
      }
      
      if (!req.body.phone || req.body.phone.length < 10) {
        errors.push("Phone number must be at least 10 digits");
      }

      if (!req.body.email || !req.body.email.includes('@')) {
        errors.push("Valid email address is required");
      }

      if (!req.body.yearOfBirth) {
        errors.push("Year of birth is required");
      } else if (!/^\d{4}$/.test(req.body.yearOfBirth)) {
        errors.push("Year of birth must be a 4-digit number");
      }
      
      if (!req.file) {
        errors.push("Receipt file is required");
      } else {
        // File type validation
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
        if (!allowedTypes.includes(req.file.mimetype)) {
          errors.push("Only JPEG, PNG, and PDF files are allowed");
        }
        
        // File size validation
        if (req.file.size > 10 * 1024 * 1024) {
          errors.push("File size must be less than 10MB");
        }
      }
      
      if (req.body.agreedTos !== 'true') {
        errors.push("You must agree to the Terms of Service");
      }

      if (!req.body.tournamentId) {
        errors.push("Tournament selection is required");
      }

      if (errors.length > 0) {
        return res.status(400).json({ 
          error: "Validation failed", 
          errors: errors 
        });
      }

      const registrationData = insertRegistrationSchema.parse({
        ...req.body,
        yearOfBirth: parseInt(req.body.yearOfBirth),
        receiptFilePath: req.file?.path || '',
        agreedTos: req.body.agreedTos === 'true'
      });

      const registration = await storage.createRegistration(registrationData);
      const tournament = await storage.getTournament(registration.tournamentId);

      res.json({
        registration,
        tournament
      });
    } catch (error) {
      console.error('Registration error:', error);
      if (error instanceof Error && error.message.includes('ZodError')) {
        return res.status(400).json({ 
          error: "Invalid data provided", 
          errors: ["Please check all required fields and try again"]
        });
      }
      res.status(400).json({ 
        error: "Registration failed", 
        errors: ["Please check your information and try again"] 
      });
    }
  });

  // Generate and download PDF for registration (secured endpoint)
  app.get("/api/registrations/:id/pdf", async (req, res) => {
    try {
      // Allow access for admin users or anyone for now (TODO: implement token-based auth for registrants)
      const isAdmin = (req.session as any)?.user === 'admin';
      
      const registration = await storage.getRegistration(req.params.id);
      if (!registration) {
        return res.status(404).json({ error: "Registration not found" });
      }

      const tournament = await storage.getTournament(registration.tournamentId);
      if (!tournament) {
        return res.status(404).json({ error: "Tournament not found" });
      }

      // Create simple HTML template with table
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              font-size: 14px;
              color: #000;
              background: #fff;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 2px solid #000;
              padding-bottom: 15px;
            }
            .header h1 {
              font-size: 20px;
              margin: 0 0 10px 0;
              color: #000;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 20px;
            }
            th, td { 
              border: 1px solid #000; 
              padding: 8px; 
              text-align: left;
            }
            th { 
              background-color: #f0f0f0; 
              font-weight: bold;
            }
            .section-header {
              background-color: #e0e0e0;
              font-weight: bold;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>SiahRokh Chess Tournament Registration</h1>
            <p>Tournament Registration Details</p>
            <p>siahrokh.ir</p>
          </div>
          
          <table>
            <tr class="section-header">
              <td colspan="2">TOURNAMENT INFORMATION</td>
            </tr>
            <tr>
              <th>Tournament Name</th>
              <td>${tournament.name}</td>
            </tr>
            <tr>
              <th>Date</th>
              <td>${new Date(tournament.date).toLocaleDateString()}</td>
            </tr>
            <tr>
              <th>Time</th>
              <td>${tournament.time}</td>
            </tr>
            <tr>
              <th>Registration Status</th>
              <td>${tournament.isOpen ? 'Open' : 'Closed'}</td>
            </tr>
          </table>

          <table>
            <tr class="section-header">
              <td colspan="2">PARTICIPANT INFORMATION</td>
            </tr>
            <tr>
              <th>Full Name</th>
              <td>${registration.name}</td>
            </tr>
            <tr>
              <th>Phone Number</th>
              <td>${registration.phone}</td>
            </tr>
            <tr>
              <th>Registration ID</th>
              <td>#${registration.id.substring(0, 8).toUpperCase()}</td>
            </tr>
            <tr>
              <th>Registration Date</th>
              <td>${new Date(registration.createdAt).toLocaleDateString()}</td>
            </tr>
            ${registration.description ? `
            <tr>
              <th>Notes</th>
              <td>${registration.description}</td>
            </tr>
            ` : ''}
          </table>

          <table>
            <tr class="section-header">
              <td colspan="2">VENUE INFORMATION</td>
            </tr>
            <tr>
              <th>Address</th>
              <td>${tournament.venueAddress}</td>
            </tr>
            ${tournament.venueInfo ? `
            <tr>
              <th>Additional Info</th>
              <td>${tournament.venueInfo}</td>
            </tr>
            ` : ''}
          </table>
        </body>
        </html>
      `;

      // Generate proper filename with tournament name and date
      const tournamentName = tournament.name.replace(/[^a-zA-Z0-9]/g, '-');
      const date = new Date(tournament.date).toISOString().slice(0, 10).replace(/-/g, '');
      const filename = `SiahRokh-${tournamentName}-${date}.html`;

      // Send HTML content that opens print dialog automatically
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      
      // Add auto-print script to HTML
      const printableHtml = html.replace('</body>', `
        <div style="background: #f9f9f9; padding: 15px; border: 1px solid #ddd; margin-bottom: 20px; border-radius: 5px;" class="no-print">
          <strong>Instructions:</strong> Use your browser's "Print" function and select "Save as PDF" to download this as a PDF file.
          <br>Press Ctrl+P (Windows/Linux) or Cmd+P (Mac) to print.
        </div>
        <script>
          // Auto-trigger print dialog after page loads
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
        </body>`);
      
      res.send(printableHtml);
    } catch (error) {
      console.error('PDF generation error:', error);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });

  // Certificate validation endpoint
  app.get("/api/certificates/:certificateId", async (req, res) => {
    try {
      const certificateId = req.params.certificateId.toUpperCase().trim();
      
      if (!certificateId || certificateId.length !== 10) {
        return res.status(400).json({ 
          error: "Invalid certificate format",
          message: "Certificate ID must be exactly 10 characters (5 digits + 5 letters)"
        });
      }

      const registration = await storage.getRegistrationByCertificateId(certificateId);
      
      if (!registration) {
        return res.status(404).json({ 
          error: "Certificate not found",
          message: "This certificate ID does not exist in our records"
        });
      }

      const tournament = await storage.getTournament(registration.tournamentId);
      
      if (!tournament) {
        return res.status(404).json({ 
          error: "Tournament not found",
          message: "The tournament associated with this certificate could not be found"
        });
      }

      res.json({
        valid: true,
        certificateId: registration.certificateId,
        confirmed: registration.certificateConfirmed,
        participant: {
          name: registration.name,
          email: registration.email,
          registrationDate: registration.createdAt
        },
        tournament: {
          name: tournament.name,
          date: tournament.date,
          venue: tournament.venueAddress
        }
      });
    } catch (error) {
      console.error('Certificate validation error:', error);
      res.status(500).json({ error: "Failed to validate certificate" });
    }
  });

  // Admin routes - protected with authentication
  app.get("/api/admin/tournaments", requireAuth, async (req, res) => {
    try {
      const { from } = req.query;
      const tournaments = await storage.getAllTournaments(from ? new Date(from as string) : undefined);
      res.json(tournaments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tournaments" });
    }
  });

  app.post("/api/admin/tournaments", requireAuth, async (req, res) => {
    try {
      const { name, date, time, isOpen, venueAddress, venueInfo, registrationFee } = req.body;
      
      // Validate required fields
      if (!name || !date || !venueAddress || !registrationFee) {
        return res.status(400).json({ error: "Missing required fields: name, date, venueAddress, registrationFee" });
      }
      
      // Handle different date formats from frontend
      let tournamentDate: Date;
      let tournamentTime: string;
      
      if (typeof date === 'string' && date.includes('T')) {
        // ISO string format from frontend
        tournamentDate = new Date(date);
        tournamentTime = time || tournamentDate.toTimeString().slice(0, 5); // Extract HH:MM
      } else {
        // Separate date and time fields
        if (!time) {
          return res.status(400).json({ error: "Time is required when date is not in ISO format" });
        }
        tournamentDate = new Date(`${date}T${time}`);
        tournamentTime = time;
      }
      
      // Check if date is valid
      if (isNaN(tournamentDate.getTime())) {
        return res.status(400).json({ error: "Invalid date or time format" });
      }
      
      const tournamentData = {
        name: name.trim(),
        date: tournamentDate,
        time: tournamentTime,
        isOpen: Boolean(isOpen),
        venueAddress: venueAddress.trim(),
        venueInfo: venueInfo?.trim() || null,
        registrationFee: registrationFee.trim()
      };
      
      const tournament = await storage.createTournament(tournamentData);
      res.json(tournament);
    } catch (error) {
      console.error('Tournament creation error:', error);
      console.error('Request body:', req.body);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to create tournament" });
    }
  });

  app.put("/api/admin/tournaments/:id", requireAuth, async (req, res) => {
    try {
      const { name, date, time, isOpen, venueAddress, venueInfo, registrationFee } = req.body;
      
      // Validate date and time inputs
      if (!date || !time) {
        return res.status(400).json({ error: "Date and time are required" });
      }
      
      // Create proper Date object from date and time strings
      const combinedDateTime = new Date(`${date}T${time}:00`);
      
      // Check if date is valid
      if (isNaN(combinedDateTime.getTime())) {
        return res.status(400).json({ error: "Invalid date or time format" });
      }
      
      const tournamentToUpdate = {
        name: name?.trim(),
        date: combinedDateTime,
        time: time,
        isOpen: Boolean(isOpen),
        venueAddress: venueAddress?.trim(),
        venueInfo: venueInfo?.trim() || null,
        registrationFee: registrationFee?.trim() || "0"
      } as InsertTournament;
      
      console.log('Updating tournament with data:', tournamentToUpdate);
      
      const tournament = await storage.updateTournament(req.params.id, tournamentToUpdate);
      res.json(tournament);
    } catch (error) {
      console.error('Tournament update error:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to update tournament" });
    }
  });

  app.delete("/api/admin/tournaments/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteTournament(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Tournament deletion error:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to delete tournament" });
    }
  });

  app.post("/api/admin/next-tournament", requireAuth, async (req, res) => {
    try {
      await storage.setNextTournament(req.body.tournamentId);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to set next tournament" });
    }
  });

  app.get("/api/admin/registrations", requireAuth, async (req, res) => {
    try {
      const tournamentId = req.query.tournamentId as string;
      if (!tournamentId) {
        return res.json([]);
      }
      const registrations = await storage.getRegistrations(tournamentId);
      res.json(registrations);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to fetch registrations" });
    }
  });

  app.post("/api/admin/registrations/:id/confirm-certificate", requireAuth, async (req, res) => {
    try {
      const registrationId = req.params.id;
      const result = await storage.confirmCertificate(registrationId);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to confirm certificate" });
    }
  });

  // Serve uploaded files
  app.use('/uploads', express.static(uploadDir));

  const httpServer = createServer(app);
  return httpServer;
}
