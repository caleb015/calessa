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
    '/public/gallery/page',
    '/public/contact',
  ];

  describe('all endpoints require no authentication', () => {
    for (const route of publicRoutes) {
      it(`GET ${route} returns 200 without a token`, () => {
        return request(app.getHttpServer()).get(route).expect(200);
      });
    }
  });

  describe('isPublic=false blocks content endpoints but not settings', () => {
    beforeAll(async () => {
      await prisma.weddingSettings.upsert({
        where: { id: 'singleton' },
        update: { isPublic: false },
        create: { id: 'singleton', isPublic: false },
      });
    });

    afterAll(async () => {
      await prisma.weddingSettings.update({ where: { id: 'singleton' }, data: { isPublic: true } });
    });

    it('GET /public/settings still returns 200 (frontend needs it to show maintenance page)', () => {
      return request(app.getHttpServer()).get('/public/settings').expect(200);
    });

    const blockedRoutes = ['/public/story', '/public/events', '/public/schedule', '/public/faqs', '/public/gallery', '/public/gallery/page', '/public/contact'];
    for (const route of blockedRoutes) {
      it(`GET ${route} returns 503`, () => {
        return request(app.getHttpServer()).get(route).expect(503);
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

  describe('GET /public/gallery/page', () => {
    const URL_PREFIX = 'https://example.com/e2e-gallery-page-';
    let ids: string[] = [];

    beforeAll(async () => {
      // Equal display orders, so paging has to rely on the tie-breakers.
      const created: { id: string }[] = [];
      for (let i = 0; i < 5; i++) {
        created.push(await prisma.galleryImage.create({ data: { imageUrl: `${URL_PREFIX}${i}.jpg`, displayOrder: 100_000 } }));
      }
      await prisma.galleryImage.create({ data: { imageUrl: `${URL_PREFIX}hidden.jpg`, displayOrder: 100_000, isPublished: false } });
      ids = created.map(c => c.id);
    });

    afterAll(async () => {
      await prisma.galleryImage.deleteMany({ where: { imageUrl: { startsWith: URL_PREFIX } } });
    });

    it('pages through published photos without repeats or gaps', async () => {
      const first = await request(app.getHttpServer()).get('/public/gallery/page?limit=1').expect(200);
      const total = first.body.total as number;
      const all = (await request(app.getHttpServer()).get('/public/gallery').expect(200)).body as { id: string }[];
      expect(total).toBe(all.length);

      const seen: string[] = [];
      for (let offset = Math.max(0, total - 6); offset < total; offset += 2) {
        const res = await request(app.getHttpServer()).get(`/public/gallery/page?offset=${offset}&limit=2`).expect(200);
        seen.push(...res.body.images.map((img: { id: string }) => img.id));
      }
      const ours = seen.filter(id => ids.includes(id));
      expect(ours).toEqual(ids); // all five, once each, oldest first
      expect(first.body.images[0]).toHaveProperty('sharedBy');
      expect(first.body.images[0]).not.toHaveProperty('guest');
    });

    it.each(['limit=0', 'limit=101', 'offset=-1', 'limit=abc', 'other=1'])('rejects %s', query =>
      request(app.getHttpServer()).get(`/public/gallery/page?${query}`).expect(400));
  });

  describe('GET /public/contact', () => {
    it('returns an array', async () => {
      const res = await request(app.getHttpServer()).get('/public/contact').expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('isPublished filter', () => {
    it('excludes unpublished FAQs from GET /public/faqs', async () => {
      const faq = await prisma.faqItem.create({
        data: { question: 'E2E hidden?', answer: 'Yes', isPublished: false, displayOrder: 999 },
      });

      const res = await request(app.getHttpServer()).get('/public/faqs').expect(200);
      expect(res.body.find((f: any) => f.id === faq.id)).toBeUndefined();

      await prisma.faqItem.delete({ where: { id: faq.id } });
    });

    it('includes published FAQs in GET /public/faqs', async () => {
      const faq = await prisma.faqItem.create({
        data: { question: 'E2E visible?', answer: 'Yes', isPublished: true, displayOrder: 999 },
      });

      const res = await request(app.getHttpServer()).get('/public/faqs').expect(200);
      expect(res.body.find((f: any) => f.id === faq.id)).toBeDefined();

      await prisma.faqItem.delete({ where: { id: faq.id } });
    });
  });
});
