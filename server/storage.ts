import { 
  users, tournaments, registrations, appSettings,
  type User, type InsertUser, type Tournament, type InsertTournament,
  type Registration, type InsertRegistration, type AppSettings
} from "@shared/schema";
import { v4 as uuidv4 } from 'uuid';

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;
  
  // Tournament methods
  getAllTournaments(fromDate?: Date): Promise<Tournament[]>;
  getOpenTournaments(): Promise<Tournament[]>;
  getTournament(id: string): Promise<Tournament | undefined>;
  createTournament(insertTournament: InsertTournament): Promise<Tournament>;
  updateTournament(id: string, insertTournament: InsertTournament): Promise<Tournament>;
  deleteTournament(id: string): Promise<void>;
  getNextTournament(): Promise<Tournament | undefined>;
  setNextTournament(tournamentId: string): Promise<void>;
  
  // Registration methods
  getRegistration(id: string): Promise<Registration | undefined>;
  getRegistrations(tournamentId?: string, search?: string): Promise<Registration[]>;
  createRegistration(insertRegistration: InsertRegistration): Promise<Registration>;
  getRegistrationByCertificateId(certificateId: string): Promise<Registration | undefined>;
  confirmCertificate(registrationId: string): Promise<Registration>;
}

// DatabaseStorage is only available when DATABASE_URL is set
class DatabaseStorage implements IStorage {
  private db: any;
  private eq: any;
  private desc: any;
  private gte: any;

  constructor() {
    // Import database dependencies dynamically when needed
    const dbModule = require('./db');
    const drizzleModule = require('drizzle-orm');
    this.db = dbModule.db;
    this.eq = drizzleModule.eq;
    this.desc = drizzleModule.desc;
    this.gte = drizzleModule.gte;
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(this.eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(this.eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await this.db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getAllTournaments(fromDate?: Date): Promise<Tournament[]> {
    if (fromDate) {
      return await this.db.select().from(tournaments)
        .where(this.gte(tournaments.date, fromDate))
        .orderBy(this.desc(tournaments.date));
    }
    return await this.db.select().from(tournaments).orderBy(this.desc(tournaments.date));
  }

  async getOpenTournaments(): Promise<Tournament[]> {
    return await this.db.select().from(tournaments).where(this.eq(tournaments.isOpen, true)).orderBy(tournaments.date);
  }

  async getTournament(id: string): Promise<Tournament | undefined> {
    const [tournament] = await this.db.select().from(tournaments).where(this.eq(tournaments.id, id));
    return tournament || undefined;
  }

  async createTournament(insertTournament: InsertTournament): Promise<Tournament> {
    const [tournament] = await this.db
      .insert(tournaments)
      .values(insertTournament)
      .returning();
    return tournament;
  }

  async updateTournament(id: string, insertTournament: InsertTournament): Promise<Tournament> {
    const [tournament] = await this.db
      .update(tournaments)
      .set({ ...insertTournament, updatedAt: new Date() })
      .where(this.eq(tournaments.id, id))
      .returning();
    return tournament;
  }

  async deleteTournament(id: string): Promise<void> {
    // First delete all registrations for this tournament
    await this.db.delete(registrations).where(this.eq(registrations.tournamentId, id));
    
    // Then delete the tournament
    await this.db.delete(tournaments).where(this.eq(tournaments.id, id));
    
    // Clear next tournament setting if this was the selected one
    const [settings] = await this.db.select().from(appSettings).limit(1);
    if (settings?.nextTournamentId === id) {
      await this.db
        .update(appSettings)
        .set({ nextTournamentId: null, updatedAt: new Date() })
        .where(this.eq(appSettings.id, settings.id));
    }
  }

  async getNextTournament(): Promise<Tournament | undefined> {
    const [settings] = await this.db.select().from(appSettings).limit(1);
    if (!settings?.nextTournamentId) return undefined;
    
    return await this.getTournament(settings.nextTournamentId);
  }

  async setNextTournament(tournamentId: string): Promise<void> {
    const [existing] = await this.db.select().from(appSettings).limit(1);
    
    if (existing) {
      await this.db
        .update(appSettings)
        .set({ nextTournamentId: tournamentId, updatedAt: new Date() })
        .where(this.eq(appSettings.id, existing.id));
    } else {
      await this.db.insert(appSettings).values({ nextTournamentId: tournamentId });
    }
  }

  async getRegistration(id: string): Promise<Registration | undefined> {
    const [registration] = await this.db.select().from(registrations).where(this.eq(registrations.id, id));
    return registration || undefined;
  }

  async getRegistrations(tournamentId?: string, search?: string): Promise<Registration[]> {
    if (tournamentId) {
      return await this.db.select().from(registrations)
        .where(this.eq(registrations.tournamentId, tournamentId))
        .orderBy(this.desc(registrations.createdAt));
    }
    
    return await this.db.select().from(registrations).orderBy(this.desc(registrations.createdAt));
  }

  // Generate unique certificate ID (5 digits + 5 letters)
  private generateCertificateId(): string {
    const digits = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    const letters = Array.from({ length: 5 }, () => 
      String.fromCharCode(65 + Math.floor(Math.random() * 26))
    ).join('');
    return digits + letters;
  }

  async createRegistration(insertRegistration: InsertRegistration): Promise<Registration> {
    let certificateId: string;
    let attempts = 0;
    const maxAttempts = 10;

    // Generate unique certificate ID with retry logic
    do {
      certificateId = this.generateCertificateId();
      attempts++;
      
      // Check if certificate ID already exists
      const existing = await this.db
        .select()
        .from(registrations)
        .where(this.eq(registrations.certificateId, certificateId))
        .limit(1);
      
      if (existing.length === 0) break;
      
      if (attempts >= maxAttempts) {
        throw new Error('Unable to generate unique certificate ID after multiple attempts');
      }
    } while (true);

    const [registration] = await this.db
      .insert(registrations)
      .values({ ...insertRegistration, certificateId })
      .returning();
    return registration;
  }

  // Certificate validation method
  async getRegistrationByCertificateId(certificateId: string): Promise<Registration | undefined> {
    const [registration] = await this.db
      .select()
      .from(registrations)
      .where(this.eq(registrations.certificateId, certificateId))
      .limit(1);
    return registration || undefined;
  }

  async confirmCertificate(registrationId: string): Promise<Registration> {
    const [registration] = await this.db
      .update(registrations)
      .set({ certificateConfirmed: true })
      .where(this.eq(registrations.id, registrationId))
      .returning();
    return registration;
  }
}

// Memory-based storage for development when database is not available
export class MemoryStorage implements IStorage {
  private users: User[] = [];
  private tournaments: Tournament[] = [];
  private registrations: Registration[] = [];
  private appSettings: AppSettings | null = null;

  // Generate unique certificate ID (5 digits + 5 letters)
  private generateCertificateId(): string {
    const digits = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    const letters = Array.from({ length: 5 }, () => 
      String.fromCharCode(65 + Math.floor(Math.random() * 26))
    ).join('');
    return digits + letters;
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.find(user => user.id === id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.users.find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      id: uuidv4(),
      ...insertUser,
    };
    this.users.push(user);
    return user;
  }

  async getAllTournaments(fromDate?: Date): Promise<Tournament[]> {
    let tournaments = this.tournaments;
    if (fromDate) {
      tournaments = tournaments.filter(t => new Date(t.date) >= fromDate);
    }
    return tournaments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getOpenTournaments(): Promise<Tournament[]> {
    return this.tournaments
      .filter(t => t.isOpen)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  async getTournament(id: string): Promise<Tournament | undefined> {
    return this.tournaments.find(tournament => tournament.id === id);
  }

  async createTournament(insertTournament: InsertTournament): Promise<Tournament> {
    const now = new Date();
    const tournament: Tournament = {
      id: uuidv4(),
      isOpen: false, // Default value
      venueInfo: null, // Default value
      ...insertTournament,
      createdAt: now,
      updatedAt: now,
    };
    this.tournaments.push(tournament);
    return tournament;
  }

  async updateTournament(id: string, insertTournament: InsertTournament): Promise<Tournament> {
    const index = this.tournaments.findIndex(t => t.id === id);
    if (index === -1) {
      throw new Error('Tournament not found');
    }
    
    const tournament: Tournament = {
      ...this.tournaments[index],
      ...insertTournament,
      updatedAt: new Date(),
    };
    this.tournaments[index] = tournament;
    return tournament;
  }

  async deleteTournament(id: string): Promise<void> {
    // Remove all registrations for this tournament
    this.registrations = this.registrations.filter(r => r.tournamentId !== id);
    
    // Remove the tournament
    this.tournaments = this.tournaments.filter(t => t.id !== id);
    
    // Clear next tournament setting if this was the selected one
    if (this.appSettings?.nextTournamentId === id) {
      this.appSettings = {
        ...this.appSettings,
        nextTournamentId: null,
        updatedAt: new Date(),
      };
    }
  }

  async getNextTournament(): Promise<Tournament | undefined> {
    if (!this.appSettings?.nextTournamentId) return undefined;
    return await this.getTournament(this.appSettings.nextTournamentId);
  }

  async setNextTournament(tournamentId: string): Promise<void> {
    if (this.appSettings) {
      this.appSettings = {
        ...this.appSettings,
        nextTournamentId: tournamentId,
        updatedAt: new Date(),
      };
    } else {
      this.appSettings = {
        id: uuidv4(),
        nextTournamentId: tournamentId,
        updatedAt: new Date(),
      };
    }
  }

  async getRegistration(id: string): Promise<Registration | undefined> {
    return this.registrations.find(registration => registration.id === id);
  }

  async getRegistrations(tournamentId?: string, search?: string): Promise<Registration[]> {
    let registrations = this.registrations;
    
    if (tournamentId) {
      registrations = registrations.filter(r => r.tournamentId === tournamentId);
    }
    
    return registrations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createRegistration(insertRegistration: InsertRegistration): Promise<Registration> {
    let certificateId: string;
    let attempts = 0;
    const maxAttempts = 10;

    // Generate unique certificate ID with retry logic
    do {
      certificateId = this.generateCertificateId();
      attempts++;
      
      // Check if certificate ID already exists
      const existing = this.registrations.find(r => r.certificateId === certificateId);
      
      if (!existing) break;
      
      if (attempts >= maxAttempts) {
        throw new Error('Unable to generate unique certificate ID after multiple attempts');
      }
    } while (true);

    const registration: Registration = {
      id: uuidv4(),
      agreedTos: false, // Default value
      description: null, // Default value
      certificateConfirmed: false, // Default value
      ...insertRegistration,
      certificateId,
      createdAt: new Date(),
    };
    this.registrations.push(registration);
    return registration;
  }

  async getRegistrationByCertificateId(certificateId: string): Promise<Registration | undefined> {
    return this.registrations.find(r => r.certificateId === certificateId);
  }

  async confirmCertificate(registrationId: string): Promise<Registration> {
    const registration = this.registrations.find(r => r.id === registrationId);
    if (!registration) {
      throw new Error('Registration not found');
    }
    registration.certificateConfirmed = true;
    return registration;
  }
}

// Initialize storage based on environment
export const storage: IStorage = (() => {
  if (process.env.DATABASE_URL) {
    try {
      return new DatabaseStorage();
    } catch (error) {
      console.log('Failed to initialize database storage, falling back to memory storage:', error);
      return new MemoryStorage();
    }
  } else {
    console.log('Using in-memory storage for development (DATABASE_URL not set)');
    return new MemoryStorage();
  }
})();