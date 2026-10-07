"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'jobgateway_super_secret_key_2026';
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        if (!decoded || typeof decoded.userId !== 'number' || !decoded.email) {
            return res.status(403).json({ error: 'Malformed authentication token payload' });
        }
        req.user = { userId: decoded.userId, email: decoded.email };
        next();
    }
    catch (err) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};
exports.authenticateToken = authenticateToken;
const generateToken = (userId, email) => {
    return jsonwebtoken_1.default.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' });
};
exports.generateToken = generateToken;
