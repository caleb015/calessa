import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const TEST_EMAIL = 'e2e+guests@example.com';
const TEST_PASSWORD = 'e2e-password-123';
const BAD_TOKEN = 'Bearer this.is.not.a.valid.jwt';

describe('Guests (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let createdId: string;

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
    await prisma.user.deleteMany({ where: { email: { startsWith: 'e2e+guests' } } });
    await prisma.guest.deleteMany({ where: { primaryName: { startsWith: 'E2E Test' } } });

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
    await prisma.guest.deleteMany({ where: { primaryName: { startsWith: 'E2E Test' } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: 'e2e+guests' } } });
    await app.close();
  });

  // ── GET /admin/guests ────────────────────────────────────────────────────────

  describe('GET /admin/guests', () => {
    it('returns 401 without a token', () => {
      return request(app.getHttpServer()).get('/admin/guests').expect(401);
    });

    it('returns 401 with a bad token', () => {
      return request(app.getHttpServer())
        .get('/admin/guests')
        .set('Authorization', BAD_TOKEN)
        .expect(401);
    });

    it('returns array with valid token', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/guests')
        .set('Authorization', token)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ── POST /admin/guests ───────────────────────────────────────────────────────

  describe('POST /admin/guests', () => {
    it('returns 401 without a token', () => {
      return request(app.getHttpServer())
        .post('/admin/guests')
        .send({ primaryName: 'E2E Test Guest' })
        .expect(401);
    });

    it('creates a guest with auto-generated code', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/guests')
        .set('Authorization', token)
        .send({ primaryName: 'E2E Test Guest', group: 'Family' })
        .expect(201);

      expect(res.body.primaryName).toBe('E2E Test Guest');
      expect(res.body.invitationCode).toBeDefined();
      expect(res.body.invitationCode.length).toBe(8);
      createdId = res.body.id;
    });

    it('creates a guest with a provided code', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/guests')
        .set('Authorization', token)
        .send({ primaryName: 'E2E Test Guest 2', invitationCode: 'E2ECODE1' })
        .expect(201);

      expect(res.body.invitationCode).toBe('E2ECODE1');
    });

    it('returns 409 when invitation code is already taken', () => {
      return request(app.getHttpServer())
        .post('/admin/guests')
        .set('Authorization', token)
        .send({ primaryName: 'E2E Test Guest 3', invitationCode: 'E2ECODE1' })
        .expect(409);
    });

    it('returns 400 when primaryName is missing', () => {
      return request(app.getHttpServer())
        .post('/admin/guests')
        .set('Authorization', token)
        .send({ group: 'Family' })
        .expect(400);
    });

    it('rejects unknown fields', () => {
      return request(app.getHttpServer())
        .post('/admin/guests')
        .set('Authorization', token)
        .send({ primaryName: 'E2E Test Guest', hackField: 'bad' })
        .expect(400);
    });
  });

  // ── POST /admin/guests/bulk ──────────────────────────────────────────────────

  describe('POST /admin/guests/bulk', () => {
    it('returns 401 without a token', () => {
      return request(app.getHttpServer())
        .post('/admin/guests/bulk')
        .send({ guests: [{ primaryName: 'E2E Test Bulk A' }] })
        .expect(401);
    });

    it('creates multiple guests and returns a summary', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/guests/bulk')
        .set('Authorization', token)
        .send({
          guests: [
            { primaryName: 'E2E Test Bulk A', group: 'Family' },
            { primaryName: 'E2E Test Bulk B', group: 'Friends' },
          ],
        })
        .expect(201);

      expect(res.body.created).toBe(2);
      expect(res.body.skipped).toBe(0);
      expect(res.body.errors).toHaveLength(0);
    });

    it('skips duplicate codes and reports errors without failing the batch', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/guests/bulk')
        .set('Authorization', token)
        .send({
          guests: [
            { primaryName: 'E2E Test Bulk C' },
            { primaryName: 'E2E Test Bulk D', invitationCode: 'E2ECODE1' }, // already taken
          ],
        })
        .expect(201);

      expect(res.body.created).toBe(1);
      expect(res.body.skipped).toBe(1);
      expect(res.body.errors[0].name).toBe('E2E Test Bulk D');
    });

    it('returns 400 when guests array is empty', () => {
      return request(app.getHttpServer())
        .post('/admin/guests/bulk')
        .set('Authorization', token)
        .send({ guests: [] })
        .expect(400);
    });
  });

  // ── GET /admin/guests/:id ────────────────────────────────────────────────────

  describe('GET /admin/guests/:id', () => {
    it('returns the guest', async () => {
      const res = await request(app.getHttpServer())
        .get(`/admin/guests/${createdId}`)
        .set('Authorization', token)
        .expect(200);
      expect(res.body.id).toBe(createdId);
    });

    it('returns 404 for unknown id', () => {
      return request(app.getHttpServer())
        .get('/admin/guests/nonexistent-id')
        .set('Authorization', token)
        .expect(404);
    });
  });

  // ── PATCH /admin/guests/:id ──────────────────────────────────────────────────

  describe('PATCH /admin/guests/:id', () => {
    it('updates guest fields', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/admin/guests/${createdId}`)
        .set('Authorization', token)
        .send({ allowedPartySize: 4 })
        .expect(200);
      expect(res.body.allowedPartySize).toBe(4);
    });

    it('returns 404 for unknown id', () => {
      return request(app.getHttpServer())
        .patch('/admin/guests/nonexistent-id')
        .set('Authorization', token)
        .send({ allowedPartySize: 2 })
        .expect(404);
    });
  });

  // ── DELETE /admin/guests/:id ─────────────────────────────────────────────────

  describe('DELETE /admin/guests/:id', () => {
    it('deletes the guest and returns 204', () => {
      return request(app.getHttpServer())
        .delete(`/admin/guests/${createdId}`)
        .set('Authorization', token)
        .expect(204);
    });

    it('returns 404 after deletion', () => {
      return request(app.getHttpServer())
        .get(`/admin/guests/${createdId}`)
        .set('Authorization', token)
        .expect(404);
    });
  });
});
