import nodemailer from 'nodemailer';

export interface EmailSendResult {
  success: boolean;
  status: 'SENT' | 'FAILED' | 'DRAFT';
  providerMessageId?: string;
  failureReason?: string;
  providerType: 'smtp' | 'draft_only';
  sentAt?: Date;
}

export interface EmailProvider {
  readonly providerType: 'smtp' | 'draft_only';
  isConfigured(): boolean;
  getConfigurationStatus(): {
    configured: boolean;
    provider: 'smtp' | 'none';
    host?: string;
    port?: number;
    user?: string;
    fromEmail?: string;
    reason?: string;
  };
  sendEmail(to: string, subject: string, body: string): Promise<EmailSendResult>;
}

export class SmtpEmailProvider implements EmailProvider {
  readonly providerType = 'smtp' as const;
  private host?: string;
  private port?: number;
  private user?: string;
  private pass?: string;
  private fromEmail?: string;

  constructor() {
    this.host = process.env.SMTP_HOST?.trim();
    this.port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT.trim(), 10) : undefined;
    this.user = process.env.SMTP_USER?.trim();
    this.pass = process.env.SMTP_PASS?.trim();
    this.fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@jobgateway.local';
  }

  isConfigured(): boolean {
    return Boolean(this.host && this.port && this.user && this.pass);
  }

  getConfigurationStatus() {
    if (this.isConfigured()) {
      return {
        configured: true,
        provider: 'smtp' as const,
        host: this.host,
        port: this.port,
        user: this.user,
        fromEmail: this.fromEmail
      };
    }
    return {
      configured: false,
      provider: 'none' as const,
      reason: 'SMTP credentials not configured in environment variables (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS).'
    };
  }

  async sendEmail(to: string, subject: string, body: string): Promise<EmailSendResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        status: 'FAILED',
        providerType: 'smtp',
        failureReason: 'Email provider not configured. Real email sending is currently unavailable.'
      };
    }

    try {
      const transporter = nodemailer.createTransport({
        host: this.host,
        port: this.port,
        secure: this.port === 465,
        auth: {
          user: this.user,
          pass: this.pass
        }
      });

      const info = await transporter.sendMail({
        from: this.fromEmail,
        to,
        subject,
        text: body
      });

      return {
        success: true,
        status: 'SENT',
        providerMessageId: info.messageId,
        providerType: 'smtp',
        sentAt: new Date()
      };
    } catch (err: any) {
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

export class DraftOnlyEmailProvider implements EmailProvider {
  readonly providerType = 'draft_only' as const;

  isConfigured(): boolean {
    return false;
  }

  getConfigurationStatus() {
    return {
      configured: false,
      provider: 'none' as const,
      reason: 'Application is operating in Draft-Only Mode. Real outbound email provider is not active.'
    };
  }

  async sendEmail(to: string, subject: string, body: string): Promise<EmailSendResult> {
    return {
      success: false,
      status: 'FAILED',
      providerType: 'draft_only',
      failureReason: 'Email sending is not configured. JobGateway operates in Draft Mode and will not claim an email was sent.'
    };
  }
}

export function createEmailProvider(): EmailProvider {
  const host = process.env.SMTP_HOST?.trim();
  const port = process.env.SMTP_PORT?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  if (host && port && user && pass) {
    return new SmtpEmailProvider();
  }
  return new DraftOnlyEmailProvider();
}
