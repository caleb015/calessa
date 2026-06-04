import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const ADMIN_EMAIL = 'e2e+admin@example.com';
const ADMIN_PASSWORD = 'e2e-password-123';
const BAD_TOKEN = 'Bearer this.is.not.a.valid.jwt';

describe('Admin (e2e)', () => {
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
    await prisma.user.deleteMany({ where: { email: { startsWith: 'e2e+admin' } } });

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
    await prisma.user.deleteMany({ where: { email: { startsWith: 'e2e+admin' } } });
    await app.close();
  });

  // ── GET /admin/summary ───────────────────────────────────────────────────

  describe('GET /admin/summary', () => {
    it('returns 401 without a token', () => {
      return request(app.getHttpServer()).get('/admin/summary').expect(401);
    });

    it('returns 401 with a bad token', () => {
      return request(app.getHttpServer())
        .get('/admin/summary')
        .set('Authorization', BAD_TOKEN)
        .expect(401);
    });

    it('returns summary data with valid token', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/summary')
        .set('Authorization', token)
        .expect(200);

      expect(res.body).toHaveProperty('totalGuests');
      expect(res.body).toHaveProperty('confirmed');
      expect(res.body).toHaveProperty('declined');
      expect(res.body).toHaveProperty('pending');
      expect(res.body).toHaveProperty('totalHeadcount');
      expect(res.body).toHaveProperty('mealCounts');
      expect(res.body).toHaveProperty('recentRsvps');
      expect(Array.isArray(res.body.recentRsvps)).toBe(true);
    });
  });

  // ── GET /admin/export/guests.csv ─────────────────────────────────────────

  describe('GET /admin/export/guests.csv', () => {
    it('returns 401 without a token', () => {
      return request(app.getHttpServer()).get('/admin/export/guests.csv').expect(401);
    });

    it('returns CSV with correct headers', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/export/guests.csv')
        .set('Authorization', token)
        .expect(200);

      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.headers['content-disposition']).toContain('guests.csv');
      expect(res.text).toContain('Name');
      expect(res.text).toContain('Invitation Code');
      expect(res.text).toContain('RSVP Status');
    });
  });

  // ── GET /admin/export/rsvps.csv ──────────────────────────────────────────

  describe('GET /admin/export/rsvps.csv', () => {
    it('returns 401 without a token', () => {
      return request(app.getHttpServer()).get('/admin/export/rsvps.csv').expect(401);
    });

    it('returns CSV with correct headers', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/export/rsvps.csv')
        .set('Authorization', token)
        .expect(200);

      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.headers['content-disposition']).toContain('rsvps.csv');
      expect(res.text).toContain('Guest Name');
      expect(res.text).toContain('Status');
      expect(res.text).toContain('Meal Preference');
    });
  });
});
