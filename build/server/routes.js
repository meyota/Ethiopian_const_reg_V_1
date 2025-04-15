import express from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertProfessionalSchema, professionalSearchSchema } from "@shared/schema";
import { setupAuth } from "./auth";
// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    return res.status(401).json({ message: "Not authenticated" });
};
// Middleware to check if user is staff
const isStaff = (req, res, next) => {
    if (req.isAuthenticated() && req.user && req.user.isStaff) {
        return next();
    }
    return res.status(403).json({ message: "Access denied. Staff role required." });
};
export async function registerRoutes(app) {
    // Set up authentication
    setupAuth(app);
    const apiRouter = express.Router();
    // Get all professionals or search by term
    apiRouter.get("/professionals", isAuthenticated, async (req, res) => {
        try {
            const { searchTerm } = professionalSearchSchema.parse(req.query);
            if (searchTerm) {
                const professionals = await storage.searchProfessionals(searchTerm);
                return res.json(professionals);
            }
            const professionals = await storage.getProfessionals();
            res.json(professionals);
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: "Invalid search parameters", details: error.format() });
            }
            res.status(500).json({ message: "Failed to fetch professionals" });
        }
    });
    // Create a new professional - requires staff role
    apiRouter.post("/professionals", isStaff, async (req, res) => {
        try {
            const professionalData = insertProfessionalSchema.parse(req.body);
            const professional = await storage.createProfessional(professionalData);
            res.status(201).json(professional);
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: "Invalid professional data", details: error.format() });
            }
            res.status(500).json({ message: "Failed to create professional" });
        }
    });
    // Update an existing professional - requires staff role
    apiRouter.patch("/professionals/:id", isStaff, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ message: "Invalid professional ID" });
            }
            const updateData = req.body;
            const professional = await storage.updateProfessional(id, updateData);
            if (!professional) {
                return res.status(404).json({ message: "Professional not found" });
            }
            res.json(professional);
        }
        catch (error) {
            res.status(500).json({ message: "Failed to update professional" });
        }
    });
    // Delete a professional - requires staff role
    apiRouter.delete("/professionals/:id", isStaff, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ message: "Invalid professional ID" });
            }
            const success = await storage.deleteProfessional(id);
            if (!success) {
                return res.status(404).json({ message: "Professional not found" });
            }
            res.status(204).send();
        }
        catch (error) {
            res.status(500).json({ message: "Failed to delete professional" });
        }
    });
    app.use("/api", apiRouter);
    const httpServer = createServer(app);
    return httpServer;
}
