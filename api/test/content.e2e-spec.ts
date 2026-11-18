import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const ADMIN_EMAIL = 'e2e+content@example.com';
const ADMIN_PASSWORD = 'e2e-password-123';

describe('Content & Seating (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    prisma = moduleRef.get(PrismaService);
    await prisma.user.deleteMany({ where: { email: { startsWith: 'e2e+content' } } });

    await request(app.getHttpServer()).post('/auth/register').send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    const res = await request(app.getHttpServer()).post('/auth/login').send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }).expect(201);
    token = `Bearer ${res.body.access_token}`;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { startsWith: 'e2e+content' } } });
    await app.close();
  });

  // ── Content CRUD (test one representative per type) ──────────────────────

  const contentEndpoints = [
    { path: '/admin/events', create: { tagline: 'Where forever begins', title: 'E2E Ceremony' }, update: { title: 'Updated Ceremony' }, updatedField: 'title', updatedValue: 'Updated Ceremony' },
    { path: '/admin/schedule', create: { timeLabel: '5:00 PM', title: 'E2E Ceremony Start' }, update: { timeLabel: '5:30 PM' }, updatedField: 'timeLabel', updatedValue: '5:30 PM' },
    { path: '/admin/faqs', create: { question: 'E2E Q?', answer: 'E2E A.' }, update: { answer: 'Updated A.' }, updatedField: 'answer', updatedValue: 'Updated A.' },
    { path: '/admin/gallery', create: { imageUrl: 'https://example.com/e2e.jpg' }, update: { title: 'E2E Photo' }, updatedField: 'title', updatedValue: 'E2E Photo' },
    { path: '/admin/story-timeline', create: { title: 'E2E Story Item' }, update: { dateLabel: '2020' }, updatedField: 'dateLabel', updatedValue: '2020' },
    { path: '/admin/contact', create: { name: 'E2E Contact' }, update: { role: 'Coordinator' }, updatedField: 'role', updatedValue: 'Coordinator' },
  ];

  for (const ep of contentEndpoints) {
    describe(ep.path, () => {
      let createdId: string;

      it('returns 401 without token', () => request(app.getHttpServer()).get(ep.path).expect(401));
      it('GET returns array', async () => {
        const res = await request(app.getHttpServer()).get(ep.path).set('Authorization', token).expect(200);
        expect(Array.isArray(res.body)).toBe(true);
      });
      it('POST creates item', async () => {
        const res = await request(app.getHttpServer()).post(ep.path).set('Authorization', token).send(ep.create).expect(201);
        expect(res.body.id).toBeDefined();
        createdId = res.body.id;
      });
      it('PATCH updates item', async () => {
        const res = await request(app.getHttpServer()).patch(`${ep.path}/${createdId}`).set('Authorization', token).send(ep.update).expect(200);
        expect(res.body[ep.updatedField]).toBe(ep.updatedValue);
      });
      it('DELETE removes item and returns 204', async () => {
        await request(app.getHttpServer()).delete(`${ep.path}/${createdId}`).set('Authorization', token).expect(204);
        await request(app.getHttpServer()).get(`${ep.path}/${createdId}`).set('Authorization', token).expect(404);
      });
    });
  }

  describe('/admin/gallery "Show on homepage"', () => {
    it('is on (and published) for photos added in the dashboard, and can be switched off and on', async () => {
      const created = await request(app.getHttpServer()).post('/admin/gallery').set('Authorization', token)
        .send({ imageUrl: 'https://example.com/e2e-homepage-toggle.jpg' }).expect(201);
      expect(created.body).toMatchObject({ showOnHomepage: true, isPublished: true });
      const off = await request(app.getHttpServer()).patch(`/admin/gallery/${created.body.id}`).set('Authorization', token)
        .send({ showOnHomepage: false }).expect(200);
      expect(off.body.showOnHomepage).toBe(false);
      const on = await request(app.getHttpServer()).patch(`/admin/gallery/${created.body.id}`).set('Authorization', token)
        .send({ showOnHomepage: true }).expect(200);
      expect(on.body.showOnHomepage).toBe(true);
      await request(app.getHttpServer()).patch(`/admin/gallery/${created.body.id}`).set('Authorization', token)
        .send({ showOnHomepage: 'yes' }).expect(400);
      await request(app.getHttpServer()).delete(`/admin/gallery/${created.body.id}`).set('Authorization', token).expect(204);
    });

    it('respects "not on the homepage" when a photo is added that way', async () => {
      const created = await request(app.getHttpServer()).post('/admin/gallery').set('Authorization', token)
        .send({ imageUrl: 'https://example.com/e2e-homepage-off.jpg', showOnHomepage: false }).expect(201);
      expect(created.body.showOnHomepage).toBe(false);
      await request(app.getHttpServer()).delete(`/admin/gallery/${created.body.id}`).set('Authorization', token).expect(204);
    });
  });

  // ── Seating ───────────────────────────────────────────────────────────────

  describe('/admin/seating', () => {
    let tableId: string;
    let guestId: string;
    let assignmentId: string;

    beforeAll(async () => {
      const guest = await prisma.guest.create({
        data: { primaryName: 'E2E Seating Guest', invitationCode: 'SEAT0001' },
      });
      guestId = guest.id;
    });

    afterAll(async () => {
      await prisma.seatingAssignment.deleteMany({ where: { guestId } });
      await prisma.guest.deleteMany({ where: { invitationCode: 'SEAT0001' } });
    });

    it('returns 401 without token', () => request(app.getHttpServer()).get('/admin/seating/tables').expect(401));

    it('GET /admin/seating/tables returns array', async () => {
      const res = await request(app.getHttpServer()).get('/admin/seating/tables').set('Authorization', token).expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('POST /admin/seating/tables creates a table', async () => {
      const res = await request(app.getHttpServer()).post('/admin/seating/tables').set('Authorization', token).send({ name: 'E2E Table', capacity: 8 }).expect(201);
      expect(res.body.name).toBe('E2E Table');
      tableId = res.body.id;
    });

    it('GET /admin/seating/unassigned includes our guest', async () => {
      const res = await request(app.getHttpServer()).get('/admin/seating/unassigned').set('Authorization', token).expect(200);
      expect(res.body.find((g: any) => g.id === guestId)).toBeDefined();
    });

    it('POST /admin/seating/assignments assigns guest to table', async () => {
      const res = await request(app.getHttpServer()).post('/admin/seating/assignments').set('Authorization', token).send({ guestId, tableId }).expect(201);
      expect(res.body.guestId).toBe(guestId);
      assignmentId = res.body.id;
    });

    it('POST /admin/seating/assignments returns 409 when guest already assigned', () => {
      return request(app.getHttpServer()).post('/admin/seating/assignments').set('Authorization', token).send({ guestId, tableId }).expect(409);
    });

    it('GET /admin/seating/unassigned excludes assigned guest', async () => {
      const res = await request(app.getHttpServer()).get('/admin/seating/unassigned').set('Authorization', token).expect(200);
      expect(res.body.find((g: any) => g.id === guestId)).toBeUndefined();
    });

    it('DELETE /admin/seating/assignments/:id removes assignment', async () => {
      await request(app.getHttpServer()).delete(`/admin/seating/assignments/${assignmentId}`).set('Authorization', token).expect(204);
    });

    it('DELETE /admin/seating/tables/:id removes table', async () => {
      await request(app.getHttpServer()).delete(`/admin/seating/tables/${tableId}`).set('Authorization', token).expect(204);
    });
  });

  // ── Events: tagline + deprecated type ───────────────────────────────────────

  describe('/admin/events tagline and legacy type', () => {
    let legacyId: string;

    beforeAll(async () => {
      // An event created before the tagline migration: label only in `type`, migrated into `tagline`.
      const legacy = await prisma.weddingEvent.create({
        data: { type: 'Where forever begins', tagline: 'Where forever begins', title: 'E2E Legacy Event' },
      });
      legacyId = legacy.id;
    });

    afterAll(async () => {
      await prisma.weddingEvent.deleteMany({ where: { title: { startsWith: 'E2E Legacy' } } });
    });

    it('never exposes the deprecated type field (admin or public)', async () => {
      const admin = await request(app.getHttpServer()).get(`/admin/events/${legacyId}`).set('Authorization', token).expect(200);
      expect(admin.body).not.toHaveProperty('type');
      expect(admin.body.tagline).toBe('Where forever begins');

      await prisma.weddingSettings.upsert({ where: { id: 'singleton' }, update: { isPublic: true }, create: { id: 'singleton' } });
      const pub = await request(app.getHttpServer()).get('/public/events').expect(200);
      for (const event of pub.body) expect(event).not.toHaveProperty('type');
    });

    it('accepts the GET response sent straight back, as the Content page does on edit', async () => {
      const res = await request(app.getHttpServer()).get(`/admin/events/${legacyId}`).set('Authorization', token).expect(200);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, createdAt, updatedAt, ...payload } = res.body;
      await request(app.getHttpServer())
        .patch(`/admin/events/${legacyId}`)
        .set('Authorization', token)
        .send({ ...payload, tagline: 'Updated tagline' })
        .expect(200);
    });

    it('keeps the legacy type value in the database when the event is edited', async () => {
      const row = await prisma.weddingEvent.findUniqueOrThrow({ where: { id: legacyId } });
      expect(row.type).toBe('Where forever begins');
      expect(row.tagline).toBe('Updated tagline');
    });

    it('rejects type in new requests', async () => {
      await request(app.getHttpServer())
        .post('/admin/events')
        .set('Authorization', token)
        .send({ type: 'ceremony', title: 'E2E Legacy Rejected' })
        .expect(400);
    });

    it('allows events without a tagline', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/events')
        .set('Authorization', token)
        .send({ title: 'E2E Legacy No Tagline' })
        .expect(201);
      expect(res.body.tagline).toBeNull();
    });
  });
});
