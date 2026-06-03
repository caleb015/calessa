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
});
