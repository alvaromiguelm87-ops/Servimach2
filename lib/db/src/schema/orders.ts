import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  real,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { profilesTable } from "./users";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),

  clientProfileId: integer("client_id")
    .notNull()
    .references(() => profilesTable.id),

  professionalProfileId: integer("professional_id")
    .notNull()
    .references(() => profilesTable.id),

  description: text("description").notNull(),

  price: real("price").notNull(),

  // Comissão do Servimach (10%)
  commission: real("commission").notNull(),

  // Valor que o profissional recebe
  professionalEarnings: real("professional_earnings").notNull(),

  // pending | accepted | completed | rejected
  status: text("status")
    .notNull()
    .default("pending"),

  // pending | paid
  paymentStatus: text("payment_status")
    .notNull()
    .default("pending"),

  // unitel_money | cash | bank_transfer | other
  paymentMethod: text("payment_method"),

  transactionId: text("transaction_id"),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),

  updatedAt: timestamp("updated_at", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertOrderSchema = createInsertSchema(
  ordersTable
).omit({
  id: true,
  commission: true,
  professionalEarnings: true,
  status: true,
  paymentStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;

export const reviewsTable = pgTable("reviews", {
  id: serial("id").primaryKey(),

  orderId: integer("order_id")
    .notNull()
    .references(() => ordersTable.id),

  clientProfileId: integer("client_id")
    .notNull()
    .references(() => profilesTable.id),

  professionalProfileId: integer("professional_id")
    .notNull()
    .references(() => profilesTable.id),

  rating: integer("rating").notNull(),

  comment: text("comment"),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
});

export const insertReviewSchema = createInsertSchema(
  reviewsTable
).omit({
  id: true,
  createdAt: true,
});

export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviewsTable.$inferSelect;

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),

  profileId: integer("user_id")
    .notNull()
    .references(() => profilesTable.id),

  message: text("message").notNull(),

  type: text("type").notNull(),

  read: boolean("read")
    .notNull()
    .default(false),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(
  notificationsTable
).omit({
  id: true,
  read: true,
  createdAt: true,
});

export type InsertNotification = z.infer<
  typeof insertNotificationSchema
>;

export type Notification =
  typeof notificationsTable.$inferSelect;
