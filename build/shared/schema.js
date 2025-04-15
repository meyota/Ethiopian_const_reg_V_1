import { pgTable, text, serial, date, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
// Users table with role flag
export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    username: text("username").notNull().unique(),
    password: text("password").notNull(),
    fullName: text("full_name").notNull(),
    isStaff: boolean("is_staff").notNull().default(false),
});
export const insertUserSchema = createInsertSchema(users).pick({
    username: true,
    password: true,
    fullName: true,
    isStaff: true,
});
// Professional registration table
export const professionals = pgTable("professionals", {
    id: serial("id").primaryKey(),
    trackingNumber: text("tracking_number").notNull(),
    fullName: text("full_name").notNull(),
    gender: text("gender").notNull(),
    dateOfRegistration: date("date_of_registration").notNull(),
    phoneNumber: text("phone_number").notNull(),
    professionalTitle: text("professional_title").notNull(),
    professionalNumber: text("professional_number").notNull(),
    sector: text("sector").notNull(),
    serviceType: text("service_type").notNull(),
});
export const insertProfessionalSchema = createInsertSchema(professionals).omit({
    id: true,
});
export const professionalSearchSchema = z.object({
    searchTerm: z.string().optional(),
});
