import { 
  users, tournaments, registrations, appSettings,
  type User, type InsertUser, type Tournament, type InsertTournament,
  type Registration, type InsertRegistration, type AppSettings
} from "@shared/schema";
import { v4 as uuidv4 } from 'uuid';
import { db } from './db';
import { eq, desc, gte } from 'drizzle-orm';

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;

  getAllTournaments(fromDate?: Date): Promise<Tournament[]>;
  getOpenTournaments(): Promise<Tournament[]>;
  getTournament(id: string): Promise<Tournament | undefined>;
  createTournament(insertTournament: InsertTournament): Promise<Tournament>;
  updateTournament(id: string, insertTournament: InsertTournament): Promise<Tournament>;
  deleteTournament(id: string): Promise<void>;
  getNextTournament(): Promise<Tournament | undefined>;
  setNextTournament(tournamentId: string): Promise<void>;

  getRegistration(id: string): Promise<Registration | undefined>;
  getRegistrations(tournamentId?: string, search?: string): Promise<Registration[]>;
  createRegistration(insertRegistration: InsertRegistration): Promise<Registration>;
  getRegistrationByCertificateId(certificateId: string): Promise<Registration | undefined>;
  confirmCertificate(registrationId: string): Promise<Registration>;
}

class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }
  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  async getAllTournaments(fromDate?: Date): Promise<Tournament[]> {
    if (fromDate) {
      return await db.select().from(tournaments).where(gte(tournaments.date, fromDate)).orderBy(desc(tournaments.date));
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
    const [tournament] = await db.insert(tournaments).values(insertTournament).returning();
    return tournament;
  }
  async updateTournament(id: string, insertTournament: InsertTournament): Promise<Tournament> {
    const [tournament] = await db.update(tournaments).set({ ...insertTournament, updatedAt: new Date() }).where(eq(tournaments.id, id)).returning();
    return tournament;
  }
  async deleteTournament(id: string): Promise<void> {
    await db.delete(registrations).where(eq(registrations.tournamentId, id));
    await db.delete(tournaments).where(eq(tournaments.id, id));
    const [settings] = await db.select().from(appSettings).limit(1);
    if (settings?.nextTournamentId === id) {
      await db.update(appSettings).set({ nextTournamentId: null, updatedAt: new Date() }).where(eq(appSettings.id, settings.id));
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
      await db.update(appSettings).set({ nextTournamentId: tournamentId, updatedAt: new Date() }).where(eq(appSettings.id, existing.id));
    } else {
      await db.insert(appSettings).values({ nextTournamentId: tournamentId });
    }
  }
  async getRegistration(id: string): Promise<Registration | undefined> {
    const [registration] = await db.select().from(registrations).where(eq(registrations.id, id));
    return registration || undefined;
  }
  async getRegistrations(tournamentId?: string, _search?: string): Promise<Registration[]> {
    if (tournamentId) {
      return await db.select().from(registrations).where(eq(registrations.tournamentId, tournamentId)).orderBy(desc(registrations.createdAt));
    }
    return await db.select().from(registrations).orderBy(desc(registrations.createdAt));
  }
  private generateCertificateId(): string {
    const digits = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    const letters = Array.from({ length: 5 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');
    return digits + letters;
  }
  async createRegistration(insertRegistration: InsertRegistration): Promise<Registration> {
    let certificateId: string;
    let attempts = 0;
    const maxAttempts = 10;
    do {
      certificateId = this.generateCertificateId();
      attempts++;
      const existing = await db.select().from(registrations).where(eq(registrations.certificateId, certificateId)).limit(1);
      if (existing.length === 0) break;
      if (attempts >= maxAttempts) throw new Error('Unable to generate unique certificate ID after multiple attempts');
    } while (true);
    const [registration] = await db.insert(registrations).values({ ...insertRegistration, certificateId }).returning();
    return registration;
  }
  async getRegistrationByCertificateId(certificateId: string): Promise<Registration | undefined> {
    const [registration] = await db.select().from(registrations).where(eq(registrations.certificateId, certificateId)).limit(1);
    return registration || undefined;
  }
  async confirmCertificate(registrationId: string): Promise<Registration> {
    const [registration] = await db.update(registrations).set({ certificateConfirmed: true }).where(eq(registrations.id, registrationId)).returning();
    return registration;
  }
}

export class MemoryStorage implements IStorage {
  private users: User[] = [];
  private tournaments: Tournament[] = [];
  private registrations: Registration[] = [];
  private appSettings: AppSettings | null = null;

  private generateCertificateId(): string {
    const digits = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    const letters = Array.from({ length: 5 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');
    return digits + letters;
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.find(user => user.id === id);
  }
  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.users.find(user => user.username === username);
  }
  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = { id: uuidv4(), ...insertUser };
    this.users.push(user);
    return user;
  }
  async getAllTournaments(fromDate?: Date): Promise<Tournament[]> {
    let tournaments = this.tournaments;
    if (fromDate) tournaments = tournaments.filter(t => new Date(t.date) >= fromDate);
    return tournaments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  async getOpenTournaments(): Promise<Tournament[]> {
    return this.tournaments.filter(t => t.isOpen).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }
  async getTournament(id: string): Promise<Tournament | undefined> {
    return this.tournaments.find(tournament => tournament.id === id);
  }
  async createTournament(insertTournament: InsertTournament): Promise<Tournament> {
    const now = new Date();
    const tournament: Tournament = {
      id: uuidv4(),
      isOpen: false,
      venueInfo: null,
      ...insertTournament,
      createdAt: now,
      updatedAt: now,
    };
    this.tournaments.push(tournament);
    return tournament;
  }
  async updateTournament(id: string, insertTournament: InsertTournament): Promise<Tournament> {
    const index = this.tournaments.findIndex(t => t.id === id);
    if (index === -1) throw new Error('Tournament not found');
    const tournament: Tournament = { ...this.tournaments[index], ...insertTournament, updatedAt: new Date() };
    this.tournaments[index] = tournament;
    return tournament;
  }
  async deleteTournament(id: string): Promise<void> {
    this.registrations = this.registrations.filter(r => r.tournamentId !== id);
    this.tournaments = this.tournaments.filter(t => t.id !== id);
    if (this.appSettings?.nextTournamentId === id) {
      this.appSettings = { ...this.appSettings, nextTournamentId: null, updatedAt: new Date() };
    }
  }
  async getNextTournament(): Promise<Tournament | undefined> {
    if (!this.appSettings?.nextTournamentId) return undefined;
    return await this.getTournament(this.appSettings.nextTournamentId);
  }
  async setNextTournament(tournamentId: string): Promise<void> {
    if (this.appSettings) {
      this.appSettings = { ...this.appSettings, nextTournamentId: tournamentId, updatedAt: new Date() };
    } else {
      this.appSettings = { id: uuidv4(), nextTournamentId: tournamentId, updatedAt: new Date() };
    }
  }
  async getRegistration(id: string): Promise<Registration | undefined> {
    return this.registrations.find(registration => registration.id === id);
  }
  async getRegistrations(tournamentId?: string, _search?: string): Promise<Registration[]> {
    let regs = this.registrations;
    if (tournamentId) regs = regs.filter(r => r.tournamentId === tournamentId);
    return regs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  async createRegistration(insertRegistration: InsertRegistration): Promise<Registration> {
    let certificateId: string;
    let attempts = 0;
    const maxAttempts = 10;
    do {
      certificateId = this.generateCertificateId();
      attempts++;
      const existing = this.registrations.find(r => r.certificateId === certificateId);
      if (!existing) break;
      if (attempts >= maxAttempts) throw new Error('Unable to generate unique certificate ID after multiple attempts');
    } while (true);
    const registration: Registration = {
      id: uuidv4(),
      agreedTos: false,
      description: null,
      certificateConfirmed: false,
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
    if (!registration) throw new Error('Registration not found');
    registration.certificateConfirmed = true;
    return registration;
  }
}

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
