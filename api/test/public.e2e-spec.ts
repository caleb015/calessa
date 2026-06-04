import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Public endpoints (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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

    await prisma.weddingSettings.upsert({
      where: { id: 'singleton' },
      update: { isPublic: true },
      create: { id: 'singleton', isPublic: true },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  const publicRoutes = [
    '/public/settings',
    '/public/story',
    '/public/events',
    '/public/schedule',
    '/public/faqs',
    '/public/gallery',
    '/public/contact',
  ];

  describe('all endpoints require no authentication', () => {
    for (const route of publicRoutes) {
      it(`GET ${route} returns 200 without a token`, () => {
        return request(app.getHttpServer()).get(route).expect(200);
      });
    }
  });

  describe('GET /public/settings', () => {
    it('returns public-safe fields only', async () => {
      const res = await request(app.getHttpServer())
        .get('/public/settings')
        .expect(200);

      expect(res.body).toHaveProperty('coupleNameA');
      expect(res.body).toHaveProperty('isRsvpEnabled');
      expect(res.body).not.toHaveProperty('id');
      expect(res.body).not.toHaveProperty('rsvpDeadline');
      expect(res.body).not.toHaveProperty('createdAt');
      expect(res.body).not.toHaveProperty('updatedAt');
    });
  });

  describe('GET /public/story', () => {
    it('returns an array', async () => {
      const res = await request(app.getHttpServer()).get('/public/story').expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /public/events', () => {
    it('returns an array', async () => {
      const res = await request(app.getHttpServer()).get('/public/events').expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /public/schedule', () => {
    it('returns an array', async () => {
      const res = await request(app.getHttpServer()).get('/public/schedule').expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /public/faqs', () => {
    it('returns an array', async () => {
      const res = await request(app.getHttpServer()).get('/public/faqs').expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /public/gallery', () => {
    it('returns an array', async () => {
      const res = await request(app.getHttpServer()).get('/public/gallery').expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /public/contact', () => {
    it('returns an array', async () => {
      const res = await request(app.getHttpServer()).get('/public/contact').expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
