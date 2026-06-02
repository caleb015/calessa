import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const TEST_EMAIL = 'e2e+main@example.com';
const TEST_PASSWORD = 'e2e-password-123';
const BAD_TOKEN = 'Bearer this.is.not.a.valid.jwt';

describe('Auth (e2e)', () => {
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

    // Clean up any leftover data from a previous failed run
    await prisma.user.deleteMany({ where: { email: { startsWith: 'e2e+' } } });

    // Register the main test user
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
      .expect(201);

    // Log in and capture the JWT
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
      .expect(201);

    token = `Bearer ${res.body.access_token}`;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { startsWith: 'e2e+' } } });
    await app.close();
  });

  // ── Public endpoints ─────────────────────────────────────────────────────────

  describe('POST /auth/register', () => {
    it('returns 409 when email is already taken', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
        .expect(409);
    });

    it('returns 400 when body is missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: TEST_EMAIL })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('returns 401 with wrong password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: TEST_EMAIL, password: 'wrong-password' })
        .expect(401);
    });

    it('returns 401 with unknown email', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody@example.com', password: TEST_PASSWORD })
        .expect(401);
    });
  });

  // ── Guard enforcement: no token → 401 ────────────────────────────────────────

  describe('JwtAuthGuard — unauthenticated requests', () => {
    const guarded = [
      { method: 'get',    path: '/auth/me' },
      { method: 'get',    path: '/auth/providers' },
      { method: 'get',    path: '/auth/link/google' },
      { method: 'patch',  path: '/auth/profile' },
      { method: 'patch',  path: '/auth/password' },
      { method: 'delete', path: '/auth/providers/google' },
      { method: 'delete', path: '/auth/profile' },
    ] as const;

    for (const { method, path } of guarded) {
      it(`${method.toUpperCase()} ${path} → 401 with no token`, async () => {
        await (request(app.getHttpServer()) as any)[method](path).expect(401);
      });

      it(`${method.toUpperCase()} ${path} → 401 with bad token`, async () => {
        await (request(app.getHttpServer()) as any)
          [method](path)
          .set('Authorization', BAD_TOKEN)
          .expect(401);
      });
    }
  });

  // ── Authenticated happy paths ─────────────────────────────────────────────────

  describe('GET /auth/me', () => {
    it('returns the current user profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', token)
        .expect(200);

      expect(res.body.email).toBe(TEST_EMAIL);
      expect(res.body.hasPassword).toBe(true);
      expect(res.body.createdAt).toBeDefined();
    });
  });

  describe('GET /auth/providers', () => {
    it('returns an empty array for a local-only user', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/providers')
        .set('Authorization', token)
        .expect(200);

      expect(res.body).toEqual([]);
    });
  });

  describe('GET /auth/link/:provider', () => {
    it('returns a url for a known provider', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/link/google')
        .set('Authorization', token)
        .expect(200);

      expect(res.body.url).toContain('response_type=code');
    });

    it('returns 400 for an unknown provider', async () => {
      await request(app.getHttpServer())
        .get('/auth/link/unknown')
        .set('Authorization', token)
        .expect(400);
    });
  });

  describe('PATCH /auth/profile', () => {
    it('updates the display name', async () => {
      const res = await request(app.getHttpServer())
        .patch('/auth/profile')
        .set('Authorization', token)
        .send({ name: 'E2E User' })
        .expect(200);

      expect(res.body.name).toBe('E2E User');
    });
  });

  describe('PATCH /auth/password', () => {
    it('returns 400 when current password is wrong', async () => {
      await request(app.getHttpServer())
        .patch('/auth/password')
        .set('Authorization', token)
        .send({ currentPassword: 'wrong', newPassword: 'newpass123' })
        .expect(400);
    });

    it('changes password successfully and allows login with new password', async () => {
      const newPassword = 'new-e2e-password-456';

      await request(app.getHttpServer())
        .patch('/auth/password')
        .set('Authorization', token)
        .send({ currentPassword: TEST_PASSWORD, newPassword })
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: TEST_EMAIL, password: newPassword })
        .expect(201);

      // Restore original password so other tests keep working
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: TEST_EMAIL, password: newPassword })
        .expect(201);
      const freshToken = `Bearer ${res.body.access_token}`;

      await request(app.getHttpServer())
        .patch('/auth/password')
        .set('Authorization', freshToken)
        .send({ currentPassword: newPassword, newPassword: TEST_PASSWORD })
        .expect(200);
    });
  });

  describe('DELETE /auth/providers/:provider', () => {
    it('returns 400 when trying to unlink a provider that is not linked', async () => {
      // The test user has no OAuth providers — this confirms the handler ran (past the guard)
      await request(app.getHttpServer())
        .delete('/auth/providers/google')
        .set('Authorization', token)
        .expect(400);
    });
  });

  // ── Account deletion (must be last) ──────────────────────────────────────────

  describe('DELETE /auth/profile', () => {
    it('deletes the account and invalidates future requests', async () => {
      // Create a disposable user for this test so we don't break the shared token
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'e2e+delete@example.com', password: TEST_PASSWORD })
        .expect(201);

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'e2e+delete@example.com', password: TEST_PASSWORD })
        .expect(201);

      const deleteToken = `Bearer ${loginRes.body.access_token}`;

      await request(app.getHttpServer())
        .delete('/auth/profile')
        .set('Authorization', deleteToken)
        .expect(204);

      // After deletion, the old token is still valid as a JWT (stateless) but the user
      // no longer exists in the DB — GET /auth/me throws 401
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', deleteToken)
        .expect(401);
    });
  });
});
