import { pgTable, text, serial, timestamp, integer, real, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable as authUsersTable } from "./auth";

export const profilesTable = pgTable("profiles", {
  id: serial("id").primaryKey(),
  authId: varchar("auth_id").notNull().unique().references(() => authUsersTable.id),
  name: text("name").notNull(),
  role: text("role").notNull().default("client"),
  whatsapp: text("whatsapp"),
  location: text("location"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProfileSchema = createInsertSchema(profilesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profilesTable.$inferSelect;

export const professionalsTable = pgTable("professionals", {
  id: serial("id").primaryKey(),
  profileId: integer("user_id").notNull().references(() => profilesTable.id),
  profession: text("profession").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  rating: real("rating").notNull().default(0),
  reviewCount: integer("review_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProfessionalSchema = createInsertSchema(professionalsTable).omit({ id: true, rating: true, reviewCount: true, createdAt: true, updatedAt: true });
export type InsertProfessional = z.infer<typeof insertProfessionalSchema>;
export type Professional = typeof professionalsTable.$inferSelect;
