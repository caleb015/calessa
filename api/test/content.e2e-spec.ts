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
    { path: '/admin/events', create: { type: 'ceremony', title: 'E2E Ceremony' }, update: { title: 'Updated Ceremony' }, updatedField: 'title', updatedValue: 'Updated Ceremony' },
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
});
