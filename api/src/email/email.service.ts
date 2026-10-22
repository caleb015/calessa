import { BadGatewayException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

interface SendInvitationOpts {
  to: string;
  guestName: string;
  rsvpLink: string;
  weddingDate?: Date | null;
  coupleNameA?: string | null;
  coupleNameB?: string | null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {}

  async sendInvitation(opts: SendInvitationOpts): Promise<void> {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException('Email is not configured: RESEND_API_KEY is not set on the API.');
    }

    const resend = new Resend(apiKey);

    const fromEmail = this.config.get<string>('FROM_EMAIL') ?? 'hello@raissaandcaleb.com';
    const rawNameA = opts.coupleNameA ?? 'Caleb';
    const rawNameB = opts.coupleNameB ?? 'Raissa';
    const nameA = escapeHtml(rawNameA);
    const nameB = escapeHtml(rawNameB);
    const guestName = escapeHtml(opts.guestName);
    const dateStr = opts.weddingDate
      ? new Date(opts.weddingDate).toLocaleDateString('en-PH', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'Asia/Manila',
        })
      : null;

    const { error } = await resend.emails.send({
      from: `${rawNameA} & ${rawNameB} <${fromEmail}>`,
      to: opts.to,
      subject: `You're invited! — ${rawNameA} & ${rawNameB}'s Wedding`,
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #333;">
          <h1 style="text-align: center; font-size: 28px; font-weight: normal; color: #5a4a3a; margin-bottom: 8px;">${nameA} &amp; ${nameB}</h1>
          <p style="text-align: center; color: #8a7a6a; font-size: 14px; margin-bottom: 32px;">request the pleasure of your company</p>

          <p style="font-size: 16px; margin-bottom: 16px;">Dear ${guestName},</p>
          <p style="font-size: 16px; line-height: 1.7; margin-bottom: 16px;">
            We are delighted to invite you to celebrate our wedding day with us.
            ${dateStr ? `Please join us on <strong>${dateStr}</strong>.` : ''}
          </p>

          <div style="text-align: center; margin: 40px 0;">
            <a href="${opts.rsvpLink}"
               style="background-color: #5a4a3a; color: white; padding: 14px 32px; text-decoration: none; border-radius: 4px; font-size: 15px; display: inline-block; letter-spacing: 0.05em;">
              RSVP Here
            </a>
          </div>

          <p style="font-size: 13px; color: #8a7a6a; text-align: center; margin-bottom: 0;">
            Or copy this link: <a href="${opts.rsvpLink}" style="color: #5a4a3a;">${opts.rsvpLink}</a>
          </p>

          <hr style="border: none; border-top: 1px solid #e8e0d8; margin: 32px 0;" />
          <p style="font-size: 12px; color: #aaa; text-align: center; margin: 0;">
            With love, ${nameA} &amp; ${nameB}
          </p>
        </div>
      `,
    });

    if (error) {
      this.logger.error(`Resend rejected invitation to ${opts.to}: ${error.message}`);
      throw new BadGatewayException(`Email provider rejected the message: ${error.message}`);
    }
  }
}
