import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const tournaments = pgTable("tournaments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  date: timestamp("date", { withTimezone: true }).notNull(),
  time: text("time").notNull(),
  isOpen: boolean("is_open").notNull().default(false),
  venueAddress: text("venue_address").notNull(),
  venueInfo: text("venue_info"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});

export const registrations = pgTable("registrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").notNull().references(() => tournaments.id),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  yearOfBirth: integer("year_of_birth").notNull(),
  receiptFilePath: text("receipt_file_path").notNull(),
  agreedTos: boolean("agreed_tos").notNull().default(false),
  description: text("description"),
  certificateId: varchar("certificate_id", { length: 10 }).notNull().unique(),
  certificateConfirmed: boolean("certificate_confirmed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
});

export const appSettings = pgTable("app_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nextTournamentId: varchar("next_tournament_id").references(() => tournaments.id),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});

export const tournamentsRelations = relations(tournaments, ({ many }) => ({
  registrations: many(registrations),
}));

export const registrationsRelations = relations(registrations, ({ one }) => ({
  tournament: one(tournaments, {
    fields: [registrations.tournamentId],
    references: [tournaments.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertTournamentSchema = createInsertSchema(tournaments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRegistrationSchema = createInsertSchema(registrations).omit({
  id: true,
  certificateId: true,
  certificateConfirmed: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Tournament = typeof tournaments.$inferSelect;
export type InsertTournament = z.infer<typeof insertTournamentSchema>;
export type Registration = typeof registrations.$inferSelect;
export type InsertRegistration = z.infer<typeof insertRegistrationSchema>;
export type AppSettings = typeof appSettings.$inferSelect;
