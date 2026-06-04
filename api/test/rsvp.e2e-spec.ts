import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const ADMIN_EMAIL = 'e2e+rsvp@example.com';
const ADMIN_PASSWORD = 'e2e-password-123';
const BAD_TOKEN = 'Bearer this.is.not.a.valid.jwt';
const TEST_CODE = 'RSVPE2E1';
const TEST_CODE_NO_PLUS = 'RSVPE2E2';

describe('RSVP (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let guestId: string;
  let rsvpId: string;

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

    // Clean up
    await prisma.rsvp.deleteMany({ where: { guest: { invitationCode: { in: [TEST_CODE, TEST_CODE_NO_PLUS] } } } });
    await prisma.guest.deleteMany({ where: { invitationCode: { in: [TEST_CODE, TEST_CODE_NO_PLUS] } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: 'e2e+rsvp' } } });

    // Create test guests
    const guest = await prisma.guest.create({
      data: { primaryName: 'E2E RSVP Guest', invitationCode: TEST_CODE, allowedPartySize: 2, plusOneAllowed: true },
    });
    guestId = guest.id;

    await prisma.guest.create({
      data: { primaryName: 'E2E RSVP Guest No Plus', invitationCode: TEST_CODE_NO_PLUS, allowedPartySize: 1, plusOneAllowed: false },
    });

    // Ensure RSVPs are enabled
    await prisma.weddingSettings.upsert({
      where: { id: 'singleton' },
      update: { isRsvpEnabled: true, allowMaybe: false, rsvpDeadline: null },
      create: { id: 'singleton', isRsvpEnabled: true, allowMaybe: false },
    });

    // Admin login
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      .expect(201);

    token = `Bearer ${res.body.access_token}`;
  });

  afterAll(async () => {
    await prisma.rsvp.deleteMany({ where: { guest: { invitationCode: { in: [TEST_CODE, TEST_CODE_NO_PLUS] } } } });
    await prisma.guest.deleteMany({ where: { invitationCode: { in: [TEST_CODE, TEST_CODE_NO_PLUS] } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: 'e2e+rsvp' } } });
    await app.close();
  });

  // ── GET /public/rsvp/:code ───────────────────────────────────────────────

  describe('GET /public/rsvp/:code', () => {
    it('returns guest data for a valid code (no auth required)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/public/rsvp/${TEST_CODE}`)
        .expect(200);

      expect(res.body.primaryName).toBe('E2E RSVP Guest');
      expect(res.body.allowedPartySize).toBe(2);
      expect(res.body).not.toHaveProperty('email'); // limited data only
    });

    it('returns 404 for an invalid code', () => {
      return request(app.getHttpServer())
        .get('/public/rsvp/BADCODE1')
        .expect(404);
    });
  });

  // ── POST /public/rsvp/:code ──────────────────────────────────────────────

  describe('POST /public/rsvp/:code', () => {
    it('submits an RSVP without auth', async () => {
      const res = await request(app.getHttpServer())
        .post(`/public/rsvp/${TEST_CODE}`)
        .send({ status: 'ATTENDING', attendeeCount: 2, email: 'juan@example.com', plusOneName: 'Jane' })
        .expect(201);

      expect(res.body.status).toBe('ATTENDING');
      expect(res.body.attendeeCount).toBe(2);
      rsvpId = res.body.id;
    });

    it('updates an existing RSVP on resubmit (upsert)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/public/rsvp/${TEST_CODE}`)
        .send({ status: 'DECLINED', attendeeCount: 0, email: 'juan@example.com' })
        .expect(201);

      expect(res.body.id).toBe(rsvpId);
      expect(res.body.status).toBe('DECLINED');
    });

    it('returns 400 when attendeeCount exceeds allowedPartySize', () => {
      return request(app.getHttpServer())
        .post(`/public/rsvp/${TEST_CODE}`)
        .send({ status: 'ATTENDING', attendeeCount: 5, email: 'juan@example.com' })
        .expect(400);
    });

    it('returns 400 when MAYBE is submitted but not allowed', () => {
      return request(app.getHttpServer())
        .post(`/public/rsvp/${TEST_CODE}`)
        .send({ status: 'MAYBE', attendeeCount: 1, email: 'juan@example.com' })
        .expect(400);
    });

    it('returns 400 when plusOneName provided but plus-one not allowed', () => {
      return request(app.getHttpServer())
        .post(`/public/rsvp/${TEST_CODE_NO_PLUS}`)
        .send({ status: 'ATTENDING', attendeeCount: 1, email: 'test@example.com', plusOneName: 'Someone' })
        .expect(400);
    });

    it('returns 400 for invalid status value', () => {
      return request(app.getHttpServer())
        .post(`/public/rsvp/${TEST_CODE}`)
        .send({ status: 'INVALID', attendeeCount: 1, email: 'juan@example.com' })
        .expect(400);
    });

    it('returns 404 for invalid code', () => {
      return request(app.getHttpServer())
        .post('/public/rsvp/BADCODE1')
        .send({ status: 'ATTENDING', attendeeCount: 1, email: 'juan@example.com' })
        .expect(404);
    });

    it('returns 400 when ATTENDING with attendeeCount 0', () => {
      return request(app.getHttpServer())
        .post(`/public/rsvp/${TEST_CODE}`)
        .send({ status: 'ATTENDING', attendeeCount: 0, email: 'juan@example.com' })
        .expect(400);
    });

    it('allows DECLINED with attendeeCount 0', async () => {
      const res = await request(app.getHttpServer())
        .post(`/public/rsvp/${TEST_CODE}`)
        .send({ status: 'DECLINED', attendeeCount: 0, email: 'juan@example.com' })
        .expect(201);
      expect(res.body.status).toBe('DECLINED');
    });
  });

  // ── GET /admin/rsvps ─────────────────────────────────────────────────────

  describe('GET /admin/rsvps', () => {
    it('returns 401 without a token', () => {
      return request(app.getHttpServer()).get('/admin/rsvps').expect(401);
    });

    it('returns 401 with a bad token', () => {
      return request(app.getHttpServer())
        .get('/admin/rsvps')
        .set('Authorization', BAD_TOKEN)
        .expect(401);
    });

    it('returns all RSVPs with valid token', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/rsvps')
        .set('Authorization', token)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ── GET /admin/rsvps/:id ─────────────────────────────────────────────────

  describe('GET /admin/rsvps/:id', () => {
    it('returns the RSVP by id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/admin/rsvps/${rsvpId}`)
        .set('Authorization', token)
        .expect(200);

      expect(res.body.id).toBe(rsvpId);
      expect(res.body.guest).toBeDefined();
    });

    it('returns 404 for unknown id', () => {
      return request(app.getHttpServer())
        .get('/admin/rsvps/nonexistent-id')
        .set('Authorization', token)
        .expect(404);
    });
  });

  // ── PATCH /admin/rsvps/:id ───────────────────────────────────────────────

  describe('PATCH /admin/rsvps/:id', () => {
    it('allows admin to override RSVP status', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/admin/rsvps/${rsvpId}`)
        .set('Authorization', token)
        .send({ status: 'ATTENDING', attendeeCount: 1 })
        .expect(200);

      expect(res.body.status).toBe('ATTENDING');
    });

    it('returns 404 for unknown id', () => {
      return request(app.getHttpServer())
        .patch('/admin/rsvps/nonexistent-id')
        .set('Authorization', token)
        .send({ status: 'ATTENDING' })
        .expect(404);
    });
  });

  // ── DELETE /admin/rsvps/:id ──────────────────────────────────────────────

  describe('DELETE /admin/rsvps/:id', () => {
    it('deletes the RSVP and returns 204', () => {
      return request(app.getHttpServer())
        .delete(`/admin/rsvps/${rsvpId}`)
        .set('Authorization', token)
        .expect(204);
    });

    it('returns 404 after deletion', () => {
      return request(app.getHttpServer())
        .get(`/admin/rsvps/${rsvpId}`)
        .set('Authorization', token)
        .expect(404);
    });
  });
});
