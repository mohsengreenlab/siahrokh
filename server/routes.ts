import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTournamentSchema, insertRegistrationSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import puppeteer from "puppeteer";
import rateLimit from "express-rate-limit";
import { v4 as uuidv4 } from "uuid";

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// File upload configuration
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage_multer = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
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
  app.use(limiter);

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
      if (!req.file) {
        return res.status(400).json({ error: "Receipt file is required" });
      }

      const registrationData = insertRegistrationSchema.parse({
        ...req.body,
        receiptFilePath: req.file.path,
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
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to create registration" });
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

  // Admin routes (only accessible via /admin24)
  app.get("/api/admin/tournaments", async (req, res) => {
    try {
      const tournaments = await storage.getAllTournaments();
      res.json(tournaments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tournaments" });
    }
  });

  app.post("/api/admin/tournaments", async (req, res) => {
    try {
      const tournamentData = insertTournamentSchema.parse(req.body);
      const tournament = await storage.createTournament(tournamentData);
      res.json(tournament);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to create tournament" });
    }
  });

  app.put("/api/admin/tournaments/:id", async (req, res) => {
    try {
      const tournamentData = insertTournamentSchema.parse(req.body);
      const tournament = await storage.updateTournament(req.params.id, tournamentData);
      res.json(tournament);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to update tournament" });
    }
  });

  app.post("/api/admin/next-tournament", async (req, res) => {
    try {
      const { tournamentId } = req.body;
      await storage.setNextTournament(tournamentId);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to set next tournament" });
    }
  });

  app.get("/api/admin/registrations", async (req, res) => {
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
