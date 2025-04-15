import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
const scryptAsync = promisify(scrypt);
async function hashPassword(password) {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64));
    return `${buf.toString("hex")}.${salt}`;
}
async function comparePasswords(supplied, stored) {
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64));
    return timingSafeEqual(hashedBuf, suppliedBuf);
}
export function setupAuth(app) {
    const sessionSettings = {
        secret: process.env.SESSION_SECRET || "ethiopian-construction-authority-secret",
        resave: false,
        saveUninitialized: false,
        store: storage.sessionStore,
        cookie: {
            maxAge: 1000 * 60 * 60 * 24, // 1 day
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
        }
    };
    app.set("trust proxy", 1);
    app.use(session(sessionSettings));
    app.use(passport.initialize());
    app.use(passport.session());
    passport.use(new LocalStrategy(async (username, password, done) => {
        try {
            const user = await storage.getUserByUsername(username);
            if (!user || !(await comparePasswords(password, user.password))) {
                return done(null, false);
            }
            else {
                return done(null, user);
            }
        }
        catch (err) {
            return done(err);
        }
    }));
    passport.serializeUser((user, done) => done(null, user.id));
    passport.deserializeUser(async (id, done) => {
        try {
            const user = await storage.getUser(id);
            done(null, user);
        }
        catch (err) {
            done(err);
        }
    });
    // Registration endpoint
    app.post("/api/register", async (req, res, next) => {
        try {
            const { username, password, fullName, isStaff } = req.body;
            // Check if user already exists
            const existingUser = await storage.getUserByUsername(username);
            if (existingUser) {
                return res.status(400).json({ message: "Username already exists" });
            }
            // Create new user with hashed password
            const user = await storage.createUser({
                username,
                password: await hashPassword(password),
                fullName,
                isStaff: !!isStaff,
            });
            // Remove password from response
            const { password: _, ...userWithoutPassword } = user;
            // Log user in after registration
            req.login(user, (err) => {
                if (err)
                    return next(err);
                res.status(201).json(userWithoutPassword);
            });
        }
        catch (error) {
            next(error);
        }
    });
    // Login endpoint
    app.post("/api/login", (req, res, next) => {
        passport.authenticate("local", (err, user, info) => {
            if (err)
                return next(err);
            if (!user)
                return res.status(401).json({ message: "Invalid username or password" });
            req.login(user, (loginErr) => {
                if (loginErr)
                    return next(loginErr);
                // Remove password from response
                const { password: _, ...userWithoutPassword } = user;
                return res.status(200).json(userWithoutPassword);
            });
        })(req, res, next);
    });
    // Logout endpoint
    app.post("/api/logout", (req, res, next) => {
        req.logout((err) => {
            if (err)
                return next(err);
            res.sendStatus(200);
        });
    });
    // Current user endpoint
    app.get("/api/user", (req, res) => {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ message: "Not authenticated" });
        }
        // Remove password from response
        const { password: _, ...userWithoutPassword } = req.user;
        res.json(userWithoutPassword);
    });
}
