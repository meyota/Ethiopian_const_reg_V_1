import { users, professionals } from "@shared/schema";
import { db } from "./db";
import { eq, like, or } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
export class DatabaseStorage {
    constructor() {
        const PostgresSessionStore = connectPg(session);
        this.sessionStore = new PostgresSessionStore({
            pool,
            createTableIfMissing: true,
            tableName: 'user_sessions'
        });
    }
    // User methods
    async getUser(id) {
        const [user] = await db.select().from(users).where(eq(users.id, id));
        return user;
    }
    async getUserByUsername(username) {
        const [user] = await db.select().from(users).where(eq(users.username, username));
        return user;
    }
    async createUser(insertUser) {
        const [user] = await db.insert(users).values(insertUser).returning();
        return user;
    }
    // Professional methods
    async getProfessionals() {
        return db.select().from(professionals);
    }
    async searchProfessionals(searchTerm) {
        if (!searchTerm) {
            return this.getProfessionals();
        }
        return db.select()
            .from(professionals)
            .where(or(like(professionals.fullName, `%${searchTerm}%`), like(professionals.phoneNumber, `%${searchTerm}%`)));
    }
    async createProfessional(insertProfessional) {
        // Format fullName and professionalTitle with first letter capitalized for each word
        const formattedData = {
            ...insertProfessional,
            fullName: this.capitalizeWords(insertProfessional.fullName),
            professionalTitle: this.capitalizeWords(insertProfessional.professionalTitle)
        };
        const [professional] = await db.insert(professionals).values(formattedData).returning();
        return professional;
    }
    // Helper method to capitalize the first letter of each word
    capitalizeWords(text) {
        if (!text)
            return text;
        return text
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
    async updateProfessional(id, updateData) {
        // Format fullName and professionalTitle if they are being updated
        const formattedData = { ...updateData };
        if (formattedData.fullName) {
            formattedData.fullName = this.capitalizeWords(formattedData.fullName);
        }
        if (formattedData.professionalTitle) {
            formattedData.professionalTitle = this.capitalizeWords(formattedData.professionalTitle);
        }
        const [professional] = await db
            .update(professionals)
            .set(formattedData)
            .where(eq(professionals.id, id))
            .returning();
        return professional;
    }
    async deleteProfessional(id) {
        const result = await db
            .delete(professionals)
            .where(eq(professionals.id, id))
            .returning();
        return result.length > 0;
    }
}
export const storage = new DatabaseStorage();
