import { BadGatewayException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { InviteData, InviteOverrides, renderInvitation } from './invite-template';

export interface SendInvitationOpts extends InviteData {
  to: string;
  template?: InviteOverrides | null;
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
    const fromName = `${opts.coupleNameA || 'Caleb'} & ${opts.coupleNameB || 'Raissa'}`;
    const { subject, html } = renderInvitation(opts.template, opts);

    const { error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: opts.to,
      subject,
      html,
    });

    if (error) {
      this.logger.error(`Resend rejected invitation to ${opts.to}: ${error.message}`);
      throw new BadGatewayException(`Email provider rejected the message: ${error.message}`);
    }
  }
}
