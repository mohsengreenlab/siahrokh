import { 
  users, tournaments, registrations, appSettings,
  type User, type InsertUser, type Tournament, type InsertTournament,
  type Registration, type InsertRegistration, type AppSettings
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, gte } from "drizzle-orm";

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
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getAllTournaments(fromDate?: Date): Promise<Tournament[]> {
    if (fromDate) {
      return await db.select().from(tournaments)
        .where(gte(tournaments.date, fromDate))
        .orderBy(desc(tournaments.date));
    }
    return await db.select().from(tournaments).orderBy(desc(tournaments.date));
  }

  async getOpenTournaments(): Promise<Tournament[]> {
    return await db.select().from(tournaments).where(eq(tournaments.isOpen, true)).orderBy(tournaments.date);
  }

  async getTournament(id: string): Promise<Tournament | undefined> {
    const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, id));
    return tournament || undefined;
  }

  async createTournament(insertTournament: InsertTournament): Promise<Tournament> {
    const [tournament] = await db
      .insert(tournaments)
      .values(insertTournament)
      .returning();
    return tournament;
  }

  async updateTournament(id: string, insertTournament: InsertTournament): Promise<Tournament> {
    const [tournament] = await db
      .update(tournaments)
      .set({ ...insertTournament, updatedAt: new Date() })
      .where(eq(tournaments.id, id))
      .returning();
    return tournament;
  }

  async deleteTournament(id: string): Promise<void> {
    // First delete all registrations for this tournament
    await db.delete(registrations).where(eq(registrations.tournamentId, id));
    
    // Then delete the tournament
    await db.delete(tournaments).where(eq(tournaments.id, id));
    
    // Clear next tournament setting if this was the selected one
    const [settings] = await db.select().from(appSettings).limit(1);
    if (settings?.nextTournamentId === id) {
      await db
        .update(appSettings)
        .set({ nextTournamentId: null, updatedAt: new Date() })
        .where(eq(appSettings.id, settings.id));
    }
  }

  async getNextTournament(): Promise<Tournament | undefined> {
    const [settings] = await db.select().from(appSettings).limit(1);
    if (!settings?.nextTournamentId) return undefined;
    
    return await this.getTournament(settings.nextTournamentId);
  }

  async setNextTournament(tournamentId: string): Promise<void> {
    const [existing] = await db.select().from(appSettings).limit(1);
    
    if (existing) {
      await db
        .update(appSettings)
        .set({ nextTournamentId: tournamentId, updatedAt: new Date() })
        .where(eq(appSettings.id, existing.id));
    } else {
      await db.insert(appSettings).values({ nextTournamentId: tournamentId });
    }
  }

  async getRegistration(id: string): Promise<Registration | undefined> {
    const [registration] = await db.select().from(registrations).where(eq(registrations.id, id));
    return registration || undefined;
  }

  async getRegistrations(tournamentId?: string, search?: string): Promise<Registration[]> {
    if (tournamentId) {
      return await db.select().from(registrations)
        .where(eq(registrations.tournamentId, tournamentId))
        .orderBy(desc(registrations.createdAt));
    }
    
    return await db.select().from(registrations).orderBy(desc(registrations.createdAt));
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
      const existing = await db
        .select()
        .from(registrations)
        .where(eq(registrations.certificateId, certificateId))
        .limit(1);
      
      if (existing.length === 0) break;
      
      if (attempts >= maxAttempts) {
        throw new Error('Unable to generate unique certificate ID after multiple attempts');
      }
    } while (true);

    const [registration] = await db
      .insert(registrations)
      .values({ ...insertRegistration, certificateId })
      .returning();
    return registration;
  }

  // Certificate validation method
  async getRegistrationByCertificateId(certificateId: string): Promise<Registration | undefined> {
    const [registration] = await db
      .select()
      .from(registrations)
      .where(eq(registrations.certificateId, certificateId))
      .limit(1);
    return registration || undefined;
  }
}

export const storage = new DatabaseStorage();