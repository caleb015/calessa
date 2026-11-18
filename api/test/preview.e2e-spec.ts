import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const ADMIN_EMAIL = 'e2e+preview@example.com';
const ADMIN_PASSWORD = 'e2e-password-123';
const CODE = 'PREVIEW1';

describe('Site preview (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let auth: string;
  let previewToken: string;

  const setPublic = (isPublic: boolean) =>
    prisma.weddingSettings.upsert({ where: { id: 'singleton' }, update: { isPublic }, create: { id: 'singleton', isPublic } });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    prisma = moduleRef.get(PrismaService);
    await prisma.user.deleteMany({ where: { email: ADMIN_EMAIL } });
    await prisma.guest.deleteMany({ where: { invitationCode: CODE } });
    await prisma.guest.create({ data: { primaryName: 'E2E Preview Guest', invitationCode: CODE } });

    await request(app.getHttpServer()).post('/auth/register').send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    const res = await request(app.getHttpServer()).post('/auth/login').send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }).expect(201);
    auth = `Bearer ${res.body.access_token}`;
    await setPublic(false);
  });

  afterAll(async () => {
    await setPublic(true);
    await prisma.guest.deleteMany({ where: { invitationCode: CODE } });
    await prisma.user.deleteMany({ where: { email: ADMIN_EMAIL } });
    await app.close();
  });

  it('POST /admin/preview-token requires login', () =>
    request(app.getHttpServer()).post('/admin/preview-token').expect(401));

  it('POST /admin/preview-token issues a token', async () => {
    const res = await request(app.getHttpServer()).post('/admin/preview-token').set('Authorization', auth).expect(201);
    expect(typeof res.body.token).toBe('string');
    previewToken = res.body.token;
  });

  it('a preview token cannot be used to log in to admin endpoints', () =>
    request(app.getHttpServer()).get('/admin/settings').set('Authorization', `Bearer ${previewToken}`).expect(401));

  it('a login token is not accepted as a preview token', () =>
    request(app.getHttpServer()).get('/public/events').set('X-Preview-Token', auth.slice(7)).expect(503));

  const contentRoutes = ['/public/story', '/public/events', '/public/schedule', '/public/faqs', '/public/gallery', '/public/gallery/page', '/public/gallery/homepage', '/public/contact', '/public/details-page'];

  for (const route of contentRoutes) {
    it(`GET ${route} is blocked while private, but works with a preview token`, async () => {
      await request(app.getHttpServer()).get(route).expect(503);
      await request(app.getHttpServer()).get(route).set('X-Preview-Token', 'not-a-token').expect(503);
      await request(app.getHttpServer()).get(route).set('X-Preview-Token', previewToken).expect(200);
    });
  }

  it('settings reports preview=false without a token and preview=true with one', async () => {
    const plain = await request(app.getHttpServer()).get('/public/settings').expect(200);
    expect(plain.body.isPublic).toBe(false);
    expect(plain.body.preview).toBe(false);

    const preview = await request(app.getHttpServer()).get('/public/settings').set('X-Preview-Token', previewToken).expect(200);
    expect(preview.body.preview).toBe(true);
  });

  it('preview allows looking up an invitation and submitting an RSVP; visitors can do neither', async () => {
    const rsvp = { status: 'ATTENDING', attendeeCount: 1, email: 'preview@example.com' };
    await request(app.getHttpServer()).get(`/public/rsvp/${CODE}`).expect(503);
    await request(app.getHttpServer()).post(`/public/rsvp/${CODE}`).send(rsvp).expect(503);
    await request(app.getHttpServer()).post(`/public/rsvp/${CODE}`).set('X-Preview-Token', 'not-a-token').send(rsvp).expect(503);

    await request(app.getHttpServer()).get(`/public/rsvp/${CODE}`).set('X-Preview-Token', previewToken).expect(200);
    await request(app.getHttpServer()).post(`/public/rsvp/${CODE}`).set('X-Preview-Token', previewToken).send(rsvp).expect(201);
    const after = await request(app.getHttpServer()).get(`/public/rsvp/${CODE}`).set('X-Preview-Token', previewToken).expect(200);
    expect(after.body.rsvp).toMatchObject({ status: 'ATTENDING', email: 'preview@example.com' });
  });
});
