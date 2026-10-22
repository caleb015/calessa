import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const TEST_EMAIL = 'e2e+settings@example.com';
const TEST_PASSWORD = 'e2e-password-123';
const BAD_TOKEN = 'Bearer this.is.not.a.valid.jwt';

describe('WeddingSettings (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    prisma = moduleRef.get(PrismaService);
    await prisma.user.deleteMany({ where: { email: { startsWith: 'e2e+settings' } } });

    // Defensive baseline: another spec file may have left isPublic flipped off,
    // which the test DB persists across separate `npm run test:e2e` invocations.
    await prisma.weddingSettings.upsert({
      where: { id: 'singleton' },
      update: { isPublic: true },
      create: { id: 'singleton', isPublic: true },
    });

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
      .expect(201);

    token = `Bearer ${res.body.access_token}`;
  });

  afterAll(async () => {
    // This file's own "updates scalar fields" test sets isPublic to false —
    // restore it so later spec files/runs don't inherit a "site offline" state.
    await prisma.weddingSettings.update({ where: { id: 'singleton' }, data: { isPublic: true } });
    await prisma.user.deleteMany({ where: { email: { startsWith: 'e2e+settings' } } });
    await app.close();
  });

  // ── GET /admin/settings ──────────────────────────────────────────────────────

  describe('GET /admin/settings', () => {
    it('returns 401 without a token', () => {
      return request(app.getHttpServer()).get('/admin/settings').expect(401);
    });

    it('returns 401 with a bad token', () => {
      return request(app.getHttpServer())
        .get('/admin/settings')
        .set('Authorization', BAD_TOKEN)
        .expect(401);
    });

    it('returns settings with a valid token', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/settings')
        .set('Authorization', token)
        .expect(200);

      expect(res.body).toHaveProperty('coupleNameA');
      expect(res.body).toHaveProperty('coupleNameB');
      expect(res.body).toHaveProperty('isRsvpEnabled');
    });
  });

  // ── PATCH /admin/settings ────────────────────────────────────────────────────

  describe('PATCH /admin/settings', () => {
    it('returns 401 without a token', () => {
      return request(app.getHttpServer())
        .patch('/admin/settings')
        .send({ coupleNameA: 'Test' })
        .expect(401);
    });

    it('updates scalar fields', async () => {
      const res = await request(app.getHttpServer())
        .patch('/admin/settings')
        .set('Authorization', token)
        .send({ coupleNameA: 'Calvin', isPublic: false })
        .expect(200);

      expect(res.body.coupleNameA).toBe('Calvin');
      expect(res.body.isPublic).toBe(false);
    });

    it('accepts valid ISO date strings', async () => {
      const res = await request(app.getHttpServer())
        .patch('/admin/settings')
        .set('Authorization', token)
        .send({ weddingDate: '2026-12-31T17:00:00.000Z' })
        .expect(200);

      expect(new Date(res.body.weddingDate).getUTCFullYear()).toBe(2026);
    });

    it('rejects unknown fields (whitelist validation)', () => {
      return request(app.getHttpServer())
        .patch('/admin/settings')
        .set('Authorization', token)
        .send({ unknownField: 'hack' })
        .expect(400);
    });

    it('rejects non-boolean for a boolean field', () => {
      return request(app.getHttpServer())
        .patch('/admin/settings')
        .set('Authorization', token)
        .send({ isPublic: 'yes' })
        .expect(400);
    });
  });

  // ── Wedding date → event date sync ───────────────────────────────────────────

  describe('PATCH /admin/settings weddingDate syncs event dates', () => {
    const TITLE_PREFIX = 'E2E Sync';
    let ceremonyId: string;
    let receptionId: string;

    beforeEach(async () => {
      await prisma.weddingEvent.deleteMany({ where: { title: { startsWith: TITLE_PREFIX } } });
      // Jan 1 2027 in Manila: ceremony 1:00–2:00 AM, reception 3:00 PM – 1:00 AM next day
      const ceremony = await prisma.weddingEvent.create({
        data: {
          type: 'ceremony', title: `${TITLE_PREFIX} Ceremony`,
          startTime: new Date('2026-12-31T17:00:00.000Z'), endTime: new Date('2026-12-31T18:00:00.000Z'),
        },
      });
      const reception = await prisma.weddingEvent.create({
        data: {
          type: 'reception', title: `${TITLE_PREFIX} Reception`,
          startTime: new Date('2027-01-01T07:00:00.000Z'), endTime: new Date('2027-01-01T17:00:00.000Z'),
        },
      });
      ceremonyId = ceremony.id;
      receptionId = reception.id;
    });

    afterAll(async () => {
      await prisma.weddingEvent.deleteMany({ where: { title: { startsWith: TITLE_PREFIX } } });
    });

    it('moves events to the new date in Manila, keeping time of day and duration', async () => {
      await request(app.getHttpServer())
        .patch('/admin/settings')
        .set('Authorization', token)
        .send({ weddingDate: '2027-02-12T07:00:00.000Z' }) // Feb 12, 3:00 PM Manila
        .expect(200);

      const ceremony = await prisma.weddingEvent.findUniqueOrThrow({ where: { id: ceremonyId } });
      const reception = await prisma.weddingEvent.findUniqueOrThrow({ where: { id: receptionId } });

      expect(ceremony.startTime!.toISOString()).toBe('2027-02-11T17:00:00.000Z'); // Feb 12, 1:00 AM Manila
      expect(ceremony.endTime!.toISOString()).toBe('2027-02-11T18:00:00.000Z');
      expect(reception.startTime!.toISOString()).toBe('2027-02-12T07:00:00.000Z'); // Feb 12, 3:00 PM Manila
      expect(reception.endTime!.toISOString()).toBe('2027-02-12T17:00:00.000Z'); // Feb 13, 1:00 AM Manila
    });

    it('leaves events alone when the update does not include weddingDate', async () => {
      await request(app.getHttpServer())
        .patch('/admin/settings')
        .set('Authorization', token)
        .send({ siteTitle: 'E2E sync check' })
        .expect(200);

      const ceremony = await prisma.weddingEvent.findUniqueOrThrow({ where: { id: ceremonyId } });
      expect(ceremony.startTime!.toISOString()).toBe('2026-12-31T17:00:00.000Z');
    });

    it('does not move events when the settings update is rejected', async () => {
      await request(app.getHttpServer())
        .patch('/admin/settings')
        .set('Authorization', token)
        .send({ weddingDate: 'not-a-date' })
        .expect(400);

      const ceremony = await prisma.weddingEvent.findUniqueOrThrow({ where: { id: ceremonyId } });
      expect(ceremony.startTime!.toISOString()).toBe('2026-12-31T17:00:00.000Z');
    });
  });
});
