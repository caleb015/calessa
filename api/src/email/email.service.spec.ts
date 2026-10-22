import { BadGatewayException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

const mockSend = jest.fn();
const mockResendCtor = jest.fn();
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation((key: string) => {
    mockResendCtor(key);
    return { emails: { send: mockSend } };
  }),
}));

const baseOpts = {
  to: 'juan@example.com',
  guestName: 'Juan dela Cruz',
  rsvpLink: 'https://raissaandcaleb.com/rsvp/TESTCODE',
  weddingDate: new Date('2027-02-11T17:00:00.000Z'), // Feb 12, 1:00 AM Manila
  coupleNameA: 'Caleb',
  coupleNameB: 'Raissa',
};

function makeService(env: Record<string, string | undefined>) {
  const config = { get: jest.fn((key: string) => env[key]) } as unknown as ConfigService;
  return new EmailService(config);
}

describe('EmailService.sendInvitation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSend.mockResolvedValue({ data: { id: 'email-1' }, error: null });
  });

  it('throws instead of silently skipping when RESEND_API_KEY is missing', async () => {
    const service = makeService({});
    await expect(service.sendInvitation(baseOpts)).rejects.toThrow(ServiceUnavailableException);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('throws when Resend returns an error instead of reporting success', async () => {
    mockSend.mockResolvedValue({ data: null, error: { message: 'Domain not verified', statusCode: 403, name: 'validation_error' } });
    const service = makeService({ RESEND_API_KEY: 're_test' });
    await expect(service.sendInvitation(baseOpts)).rejects.toThrow(BadGatewayException);
    await expect(service.sendInvitation(baseOpts)).rejects.toThrow('Domain not verified');
  });

  it('sends with the configured key, sender, recipient and RSVP link', async () => {
    const service = makeService({ RESEND_API_KEY: 're_test', FROM_EMAIL: 'hello@raissaandcaleb.com' });
    await service.sendInvitation(baseOpts);

    expect(mockResendCtor).toHaveBeenCalledWith('re_test');
    const payload = mockSend.mock.calls[0][0];
    expect(payload.from).toBe('Caleb & Raissa <hello@raissaandcaleb.com>');
    expect(payload.to).toBe('juan@example.com');
    expect(payload.subject).toBe("You're invited! — Caleb & Raissa's Wedding");
    expect(payload.html).toContain('href="https://raissaandcaleb.com/rsvp/TESTCODE"');
    expect(payload.html).toContain('Dear Juan dela Cruz,');
  });

  it('formats the wedding date in Manila time, not the server timezone', async () => {
    const service = makeService({ RESEND_API_KEY: 're_test' });
    await service.sendInvitation(baseOpts);
    const { html } = mockSend.mock.calls[0][0];
    expect(html).toContain('Friday, February 12, 2027');
    expect(html).not.toContain('February 11'); // what a UTC server would show without the fix
  });

  it('escapes names in the HTML body but keeps them plain in sender and subject', async () => {
    const service = makeService({ RESEND_API_KEY: 're_test' });
    await service.sendInvitation({
      ...baseOpts,
      guestName: '<script>alert(1)</script> & Co',
      coupleNameA: 'Ana & Ben',
    });
    const payload = mockSend.mock.calls[0][0];
    expect(payload.html).not.toContain('<script>');
    expect(payload.html).toContain('Dear &lt;script&gt;alert(1)&lt;/script&gt; &amp; Co,');
    expect(payload.html).toContain('Ana &amp; Ben');
    expect(payload.from).toContain('Ana & Ben & Raissa');
    expect(payload.subject).toContain('Ana & Ben & Raissa');
  });

  it('omits the date sentence when no wedding date is set', async () => {
    const service = makeService({ RESEND_API_KEY: 're_test' });
    await service.sendInvitation({ ...baseOpts, weddingDate: null });
    expect(mockSend.mock.calls[0][0].html).not.toContain('Please join us on');
  });
});
