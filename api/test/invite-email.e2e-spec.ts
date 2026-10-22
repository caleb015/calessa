import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { INVITE_DEFAULTS, INVITE_FIELDS } from '../src/email/invite-template';

const TEST_EMAIL = 'e2e+invite@example.com';
const TEST_PASSWORD = 'e2e-password-123';
const CLEARED = Object.fromEntries(INVITE_FIELDS.map(f => [f, null]));

describe('Invite email template (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    prisma = moduleRef.get(PrismaService);
    await prisma.user.deleteMany({ where: { email: { startsWith: 'e2e+invite' } } });
    await prisma.weddingSettings.upsert({
      where: { id: 'singleton' },
      update: CLEARED,
      create: { id: 'singleton' },
    });

    await request(app.getHttpServer()).post('/auth/register').send({ email: TEST_EMAIL, password: TEST_PASSWORD }).expect(201);
    const res = await request(app.getHttpServer()).post('/auth/login').send({ email: TEST_EMAIL, password: TEST_PASSWORD }).expect(201);
    token = `Bearer ${res.body.access_token}`;
  });

  afterAll(async () => {
    await prisma.weddingSettings.update({ where: { id: 'singleton' }, data: CLEARED });
    await prisma.user.deleteMany({ where: { email: { startsWith: 'e2e+invite' } } });
    await app.close();
  });

  it('requires authentication for every endpoint', async () => {
    const server = app.getHttpServer();
    await request(server).get('/admin/invite-email').expect(401);
    await request(server).patch('/admin/invite-email').send({}).expect(401);
    await request(server).post('/admin/invite-email/preview').send({}).expect(401);
  });

  it('returns blank saved values plus defaults and placeholders', async () => {
    const res = await request(app.getHttpServer()).get('/admin/invite-email').set('Authorization', token).expect(200);
    expect(res.body.template.inviteSubject).toBe('');
    expect(res.body.defaults).toEqual(INVITE_DEFAULTS);
    expect(res.body.placeholders).toEqual(expect.arrayContaining(['{guestName}', '{weddingDate}']));
  });

  it('saves overrides and returns them', async () => {
    const res = await request(app.getHttpServer())
      .patch('/admin/invite-email')
      .set('Authorization', token)
      .send({ inviteButtonText: 'Reply here', inviteAccentColor: '#c84b7a' })
      .expect(200);
    expect(res.body.template.inviteButtonText).toBe('Reply here');
    expect(res.body.template.inviteAccentColor).toBe('#c84b7a');

    const again = await request(app.getHttpServer()).get('/admin/invite-email').set('Authorization', token).expect(200);
    expect(again.body.template.inviteButtonText).toBe('Reply here');
  });

  it('clears an override with an empty string', async () => {
    const res = await request(app.getHttpServer())
      .patch('/admin/invite-email')
      .set('Authorization', token)
      .send({ inviteButtonText: '' })
      .expect(200);
    expect(res.body.template.inviteButtonText).toBe('');
  });

  it('rejects invalid colors and unknown fields', async () => {
    const server = app.getHttpServer();
    await request(server).patch('/admin/invite-email').set('Authorization', token).send({ inviteAccentColor: 'red' }).expect(400);
    await request(server).patch('/admin/invite-email').set('Authorization', token).send({ isPublic: false }).expect(400);
    await request(server).post('/admin/invite-email/preview').set('Authorization', token).send({ inviteTextColor: 'url(x)' }).expect(400);
  });

  it('previews unsaved edits on top of saved values without saving them', async () => {
    await request(app.getHttpServer())
      .patch('/admin/invite-email')
      .set('Authorization', token)
      .send({ inviteAccentColor: '#c84b7a' })
      .expect(200);

    const res = await request(app.getHttpServer())
      .post('/admin/invite-email/preview')
      .set('Authorization', token)
      .send({ inviteSubject: 'Hello {guestName}', inviteButtonText: 'Count me in' })
      .expect(200);

    expect(res.body.subject).toBe('Hello Juan dela Cruz');
    expect(res.body.html).toContain('Count me in');
    expect(res.body.html).toContain('#c84b7a'); // saved value still applied
    expect(res.body.html).toContain('/rsvp/SAMPLE01');

    const saved = await request(app.getHttpServer()).get('/admin/invite-email').set('Authorization', token).expect(200);
    expect(saved.body.template.inviteSubject).toBe('');
    expect(saved.body.template.inviteButtonText).toBe('');
  });
});
