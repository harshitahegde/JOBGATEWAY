"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DraftOnlyEmailProvider = exports.SmtpEmailProvider = void 0;
exports.createEmailProvider = createEmailProvider;
const nodemailer_1 = __importDefault(require("nodemailer"));
const fs_1 = __importDefault(require("fs"));
class SmtpEmailProvider {
    constructor() {
        this.providerType = 'smtp';
        this.host = process.env.SMTP_HOST?.trim();
        this.port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT.trim(), 10) : undefined;
        this.user = process.env.SMTP_USER?.trim();
        this.pass = process.env.SMTP_PASS?.trim();
        this.fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@jobgateway.local';
    }
    isConfigured() {
        return Boolean(this.host && this.port && this.user && this.pass);
    }
    getConfigurationStatus() {
        if (this.isConfigured()) {
            return {
                configured: true,
                provider: 'smtp',
                host: this.host,
                port: this.port,
                user: this.user,
                fromEmail: this.fromEmail
            };
        }
        return {
            configured: false,
            provider: 'none',
            reason: 'SMTP credentials not configured in environment variables (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS).'
        };
    }
    async sendEmail(to, subject, body, attachments) {
        if (!this.isConfigured()) {
            return {
                success: false,
                status: 'FAILED',
                providerType: 'smtp',
                failureReason: 'Email provider not configured. Real email sending is currently unavailable.'
            };
        }
        try {
            const transporter = nodemailer_1.default.createTransport({
                host: this.host,
                port: this.port,
                secure: this.port === 465,
                auth: {
                    user: this.user,
                    pass: this.pass
                }
            });
            const validAttachments = (attachments || []).filter(a => a.content || (a.path && fs_1.default.existsSync(a.path)));
            const info = await transporter.sendMail({
                from: this.fromEmail,
                to,
                subject,
                text: body,
                attachments: validAttachments.map(a => ({
                    filename: a.filename,
                    path: a.path,
                    content: a.content
                }))
            });
            return {
                success: true,
                status: 'SENT',
                providerMessageId: info.messageId,
                providerType: 'smtp',
                sentAt: new Date()
            };
        }
        catch (err) {
            // Never leak SMTP password or sensitive tokens in failureReason
            const safeMessage = (err?.message || 'SMTP delivery failed').replace(this.pass || '', '***');
            return {
                success: false,
                status: 'FAILED',
                providerType: 'smtp',
                failureReason: safeMessage
            };
        }
    }
}
exports.SmtpEmailProvider = SmtpEmailProvider;
class DraftOnlyEmailProvider {
    constructor() {
        this.providerType = 'draft_only';
    }
    isConfigured() {
        return false;
    }
    getConfigurationStatus() {
        return {
            configured: false,
            provider: 'none',
            reason: 'Application is operating in Draft-Only Mode. Real outbound email provider is not active.'
        };
    }
    async sendEmail(to, subject, body, attachments) {
        return {
            success: false,
            status: 'FAILED',
            providerType: 'draft_only',
            failureReason: 'Email sending is not configured. JobGateway operates in Draft Mode and will not claim an email was sent.'
        };
    }
}
exports.DraftOnlyEmailProvider = DraftOnlyEmailProvider;
function createEmailProvider() {
    const host = process.env.SMTP_HOST?.trim();
    const port = process.env.SMTP_PORT?.trim();
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim();
    if (host && port && user && pass) {
        return new SmtpEmailProvider();
    }
    return new DraftOnlyEmailProvider();
}
