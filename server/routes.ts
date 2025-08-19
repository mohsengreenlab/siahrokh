import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTournamentSchema, insertRegistrationSchema, InsertTournament } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import puppeteer from "puppeteer";
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

  // Generate and download PDF for registration
  app.get("/api/registrations/:id/pdf", async (req, res) => {
    try {
      const registration = await storage.getRegistration(req.params.id);
      if (!registration) {
        return res.status(404).json({ error: "Registration not found" });
      }

      const tournament = await storage.getTournament(registration.tournamentId);
      if (!tournament) {
        return res.status(404).json({ error: "Tournament not found" });
      }

      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();

      const html = `
        <!DOCTYPE html>
        <html dir="rtl" lang="fa">
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; direction: rtl; text-align: right; margin: 40px; }
            .header { text-align: center; margin-bottom: 40px; }
            .info-section { margin-bottom: 30px; padding: 20px; border: 1px solid #ddd; }
            .info-row { margin-bottom: 10px; }
            .label { font-weight: bold; display: inline-block; width: 150px; }
            .value { color: #333; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>جزئیات ثبت‌نام تورنمنت</h1>
            <p>سیاه‌رخ - مرکز تورنمنت‌های شطرنج</p>
          </div>
          
          <div class="info-section">
            <h2>اطلاعات تورنمنت</h2>
            <div class="info-row">
              <span class="label">نام تورنمنت:</span>
              <span class="value">${tournament.name}</span>
            </div>
            <div class="info-row">
              <span class="label">تاریخ:</span>
              <span class="value">${new Date(tournament.date).toLocaleDateString('fa-IR')}</span>
            </div>
            <div class="info-row">
              <span class="label">زمان:</span>
              <span class="value">${tournament.time}</span>
            </div>
          </div>

          <div class="info-section">
            <h2>اطلاعات شرکت‌کننده</h2>
            <div class="info-row">
              <span class="label">نام و نام خانوادگی:</span>
              <span class="value">${registration.name}</span>
            </div>
            <div class="info-row">
              <span class="label">شماره تلفن:</span>
              <span class="value">${registration.phone}</span>
            </div>
            <div class="info-row">
              <span class="label">شماره ثبت‌نام:</span>
              <span class="value">#${registration.id.substring(0, 8).toUpperCase()}</span>
            </div>
          </div>

          <div class="info-section">
            <h2>محل برگزاری</h2>
            <div class="info-row">
              <span class="label">آدرس:</span>
              <span class="value">${tournament.venueAddress}</span>
            </div>
            ${tournament.venueInfo ? `
            <div class="info-row">
              <span class="label">توضیحات:</span>
              <span class="value">${tournament.venueInfo}</span>
            </div>
            ` : ''}
          </div>
        </body>
        </html>
      `;

      await page.setContent(html);
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          bottom: '20px',
          left: '20px',
          right: '20px'
        }
      });

      await browser.close();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="registration-${registration.id}.pdf"`);
      res.send(pdf);
    } catch (error) {
      console.error('PDF generation error:', error);
      res.status(500).json({ error: "Failed to generate PDF" });
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
      let tournamentData = req.body;
      
      // Convert date+time from frontend format to proper Date object
      if (typeof tournamentData.date === 'string' && tournamentData.date.includes('T')) {
        // Date is already combined with time (ISO format from frontend)
        const dateObj = new Date(tournamentData.date);
        tournamentData = {
          ...tournamentData,
          date: dateObj,
          time: dateObj.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
        };
      } else if (typeof tournamentData.date === 'string' && tournamentData.time) {
        // Separate date and time fields
        const combinedDateTime = new Date(tournamentData.date + 'T' + tournamentData.time);
        tournamentData = {
          ...tournamentData,
          date: combinedDateTime
        };
      }
      
      // Log for debugging
      console.log('Processing tournament data:', tournamentData);
      
      // Skip Zod validation and create tournament directly with proper typing
      const tournamentToCreate = {
        name: tournamentData.name,
        date: tournamentData.date instanceof Date ? tournamentData.date : new Date(tournamentData.date),
        time: tournamentData.time,
        isOpen: Boolean(tournamentData.isOpen),
        venueAddress: tournamentData.venueAddress,
        venueInfo: tournamentData.venueInfo || null
      } as InsertTournament;
      
      const tournament = await storage.createTournament(tournamentToCreate);
      res.json(tournament);
    } catch (error) {
      console.error('Tournament creation error:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to create tournament" });
    }
  });

  app.put("/api/admin/tournaments/:id", requireAuth, async (req, res) => {
    try {
      const tournamentData = insertTournamentSchema.parse(req.body);
      const tournament = await storage.updateTournament(req.params.id, tournamentData);
      res.json(tournament);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to update tournament" });
    }
  });

  app.post("/api/admin/next-tournament", requireAuth, async (req, res) => {
    try {
      const { tournamentId } = req.body;
      await storage.setNextTournament(tournamentId);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to set next tournament" });
    }
  });

  app.get("/api/admin/registrations", requireAuth, async (req, res) => {
    try {
      const { tournamentId, search } = req.query;
      const registrations = await storage.getRegistrations(tournamentId as string, search as string);
      res.json(registrations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch registrations" });
    }
  });

  // Serve uploaded files
  app.use('/uploads', express.static(uploadDir));

  const httpServer = createServer(app);
  return httpServer;
}
