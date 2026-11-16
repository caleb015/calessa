import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { DETAILS_PAGE_DEFAULTS } from '../src/details-page/details-page.defaults';

const TEST_EMAIL = 'e2e+details@example.com';
const TEST_PASSWORD = 'e2e-password-123';

describe('Details page + Dress Code (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;

  const resetRows = async () => {
    await prisma.detailsPage.deleteMany({});
    await prisma.dressCode.deleteMany({});
    await prisma.dressCodeGuideline.deleteMany({});
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    prisma = moduleRef.get(PrismaService);
    await prisma.user.deleteMany({ where: { email: { startsWith: 'e2e+details' } } });
    await resetRows();
    await prisma.weddingSettings.upsert({
      where: { id: 'singleton' },
      update: { isPublic: true, coupleNameA: 'Caleb', coupleNameB: 'Raissa' },
      create: { id: 'singleton', isPublic: true },
    });

    await request(app.getHttpServer()).post('/auth/register').send({ email: TEST_EMAIL, password: TEST_PASSWORD }).expect(201);
    const res = await request(app.getHttpServer()).post('/auth/login').send({ email: TEST_EMAIL, password: TEST_PASSWORD }).expect(201);
    token = `Bearer ${res.body.access_token}`;
  });

  afterAll(async () => {
    await resetRows();
    await prisma.weddingEvent.deleteMany({ where: { title: { startsWith: 'E2E Details' } } });
    await prisma.weddingSettings.update({ where: { id: 'singleton' }, data: { isPublic: true } });
    await prisma.user.deleteMany({ where: { email: { startsWith: 'e2e+details' } } });
    await app.close();
  });

  const server = () => app.getHttpServer();
  const admin = (method: 'get' | 'post' | 'patch' | 'delete', path: string) => request(server())[method](path).set('Authorization', token);

  it('requires authentication for admin endpoints', async () => {
    await request(server()).get('/admin/details-page').expect(401);
    await request(server()).patch('/admin/details-page').send({}).expect(401);
    await request(server()).get('/admin/dress-code').expect(401);
    await request(server()).get('/admin/dress-code-guidelines').expect(401);
    await request(server()).post('/admin/dress-code-guidelines').send({}).expect(401);
  });

  describe('Details page settings', () => {
    it('returns blanks plus defaults and does not create a row when read', async () => {
      const res = await admin('get', '/admin/details-page').expect(200);
      expect(res.body.page).toMatchObject({ headerEyebrow: '', location: '', showAddToCalendar: true, ctaEnabled: true });
      expect(res.body.defaults).toEqual(DETAILS_PAGE_DEFAULTS);
      expect(await prisma.detailsPage.count()).toBe(0);
    });

    it('public page uses defaults before anything is saved', async () => {
      const res = await request(server()).get('/public/details-page').expect(200);
      expect(res.body.header).toEqual({ eyebrow: 'The Wedding', title: 'Details', location: null });
      expect(res.body.cta).toEqual({
        heading: DETAILS_PAGE_DEFAULTS.ctaHeading,
        subtext: DETAILS_PAGE_DEFAULTS.ctaSubtext,
        buttonLabel: DETAILS_PAGE_DEFAULTS.ctaButtonLabel,
      });
      expect(res.body.dressCode).toBeNull();
    });

    it('saves edits, and an empty string falls back to the default', async () => {
      await admin('patch', '/admin/details-page').send({ headerEyebrow: 'Our Wedding', location: 'Antipolo, Rizal' }).expect(200);
      let pub = await request(server()).get('/public/details-page').expect(200);
      expect(pub.body.header).toEqual({ eyebrow: 'Our Wedding', title: 'Details', location: 'Antipolo, Rizal' });

      await admin('patch', '/admin/details-page').send({ headerEyebrow: '' }).expect(200);
      pub = await request(server()).get('/public/details-page').expect(200);
      expect(pub.body.header.eyebrow).toBe('The Wedding');
    });

    it('accepts the admin GET response sent straight back (dashboard save round trip)', async () => {
      const res = await admin('get', '/admin/details-page').expect(200);
      await admin('patch', '/admin/details-page').send(res.body.page).expect(200);
    });

    it('hides the call to action and calendar when switched off', async () => {
      await admin('patch', '/admin/details-page').send({ ctaEnabled: false, showAddToCalendar: false }).expect(200);
      const pub = await request(server()).get('/public/details-page').expect(200);
      expect(pub.body.cta).toBeNull();
      expect(pub.body.calendar).toBeNull();
      await admin('patch', '/admin/details-page').send({ ctaEnabled: true, showAddToCalendar: true }).expect(200);
    });

    it('rejects unknown fields and wrong types', async () => {
      await admin('patch', '/admin/details-page').send({ isPublic: false }).expect(400);
      await admin('patch', '/admin/details-page').send({ ctaEnabled: 'yes' }).expect(400);
    });
  });

  describe('Add to Calendar', () => {
    beforeAll(async () => {
      await prisma.weddingEvent.create({
        data: { title: 'E2E Details Ceremony', venueName: 'Emerald Events Place', startTime: new Date('2027-02-12T08:30:00.000Z'), endTime: new Date('2027-02-12T13:00:00.000Z') },
      });
    });

    it('includes calendar data on the public page', async () => {
      const pub = await request(server()).get('/public/details-page').expect(200);
      expect(pub.body.calendar).toMatchObject({ title: "Caleb & Raissa's Wedding", allDay: false, location: 'Antipolo, Rizal' });
    });

    it('serves an .ics file', async () => {
      const res = await request(server()).get('/public/calendar.ics').expect(200);
      expect(res.headers['content-type']).toMatch(/^text\/calendar/);
      expect(res.headers['content-disposition']).toContain('wedding.ics');
      expect(res.text).toContain('BEGIN:VEVENT');
      expect(res.text).toContain('LOCATION:Antipolo\\, Rizal');
    });
  });

  describe('Dress Code', () => {
    it('is hidden on the public page until enabled', async () => {
      await admin('patch', '/admin/dress-code').send({ title: 'The Dress Code' }).expect(200);
      const pub = await request(server()).get('/public/details-page').expect(200);
      expect(pub.body.dressCode).toBeNull();
    });

    it('saves settings including the palette', async () => {
      const res = await admin('patch', '/admin/dress-code')
        .send({ enabled: true, eyebrow: 'Come in color!', intro: 'Solid colors please.', palette: ['#9fb6cd', '#a8a060', '#e8b93f'] })
        .expect(200);
      expect(res.body).toEqual({ enabled: true, eyebrow: 'Come in color!', title: 'The Dress Code', intro: 'Solid colors please.', palette: ['#9fb6cd', '#a8a060', '#e8b93f'] });
    });

    it('rejects invalid palette colors and oversized palettes', async () => {
      await admin('patch', '/admin/dress-code').send({ palette: ['#9fb6cd', 'blue'] }).expect(400);
      await admin('patch', '/admin/dress-code').send({ palette: Array(25).fill('#ffffff') }).expect(400);
    });

    it('creates, lists in display order, updates, and deletes guidelines', async () => {
      const gents = await admin('post', '/admin/dress-code-guidelines').send({ label: 'For the Gentlemen', text: 'Barongs or suits', displayOrder: 2 }).expect(201);
      const ladies = await admin('post', '/admin/dress-code-guidelines')
        .send({ label: 'For the Ladies', text: 'Maxi or midi dresses', note: 'Please avoid white and beige.', displayOrder: 1 })
        .expect(201);

      const list = await admin('get', '/admin/dress-code-guidelines').expect(200);
      expect(list.body.map((g: { label: string }) => g.label)).toEqual(['For the Ladies', 'For the Gentlemen']);

      const pub = await request(server()).get('/public/details-page').expect(200);
      expect(pub.body.dressCode.guidelines).toEqual([
        { id: ladies.body.id, label: 'For the Ladies', text: 'Maxi or midi dresses', note: 'Please avoid white and beige.', imageUrls: [] },
        { id: gents.body.id, label: 'For the Gentlemen', text: 'Barongs or suits', note: null, imageUrls: [] },
      ]);
      expect(pub.body.dressCode.palette).toEqual(['#9fb6cd', '#a8a060', '#e8b93f']);

      await admin('patch', `/admin/dress-code-guidelines/${gents.body.id}`).send({ text: 'Barongs, dress shirts, or suits' }).expect(200);
      await admin('delete', `/admin/dress-code-guidelines/${gents.body.id}`).expect(204);
      await admin('get', `/admin/dress-code-guidelines/${gents.body.id}`).expect(404);
    });

    it('accepts a guideline GET response sent straight back (dashboard save round trip)', async () => {
      const list = await admin('get', '/admin/dress-code-guidelines').expect(200);
      const { label, text, note, displayOrder, imageUrls } = list.body[0];
      await admin('patch', `/admin/dress-code-guidelines/${list.body[0].id}`).send({ label, text, note, displayOrder, imageUrls }).expect(200);
    });

    it('stores example outfit photos per guideline, in order, and shows them publicly', async () => {
      const photos = ['https://res.cloudinary.com/demo/image/upload/v1/calessa/a.jpg', 'https://example.com/b.png'];
      const created = await admin('post', '/admin/dress-code-guidelines')
        .send({ label: 'Photo ideas', text: 'Like these', imageUrls: photos, displayOrder: 9 })
        .expect(201);
      expect(created.body.imageUrls).toEqual(photos);

      const reordered = [...photos].reverse();
      await admin('patch', `/admin/dress-code-guidelines/${created.body.id}`).send({ imageUrls: reordered }).expect(200);
      const pub = await request(server()).get('/public/details-page').expect(200);
      const shown = pub.body.dressCode.guidelines.find((g: { id: string }) => g.id === created.body.id);
      expect(shown.imageUrls).toEqual(reordered);

      // Editing other fields leaves the photos alone; an empty list removes them.
      await admin('patch', `/admin/dress-code-guidelines/${created.body.id}`).send({ text: 'Something like these' }).expect(200);
      expect((await admin('get', `/admin/dress-code-guidelines/${created.body.id}`).expect(200)).body.imageUrls).toEqual(reordered);
      await admin('patch', `/admin/dress-code-guidelines/${created.body.id}`).send({ imageUrls: [] }).expect(200);
      expect((await admin('get', `/admin/dress-code-guidelines/${created.body.id}`).expect(200)).body.imageUrls).toEqual([]);
      await admin('delete', `/admin/dress-code-guidelines/${created.body.id}`).expect(204);
    });

    it('rejects guideline photos that are not web links, and too many photos', async () => {
      const list = await admin('get', '/admin/dress-code-guidelines').expect(200);
      const id = list.body[0].id;
      await admin('patch', `/admin/dress-code-guidelines/${id}`).send({ imageUrls: ['javascript:alert(1)'] }).expect(400);
      await admin('patch', `/admin/dress-code-guidelines/${id}`).send({ imageUrls: [42] }).expect(400);
      await admin('patch', `/admin/dress-code-guidelines/${id}`).send({ imageUrls: Array(13).fill('https://example.com/a.jpg') }).expect(400);
    });

    it('requires label and text for guidelines', async () => {
      await admin('post', '/admin/dress-code-guidelines').send({ label: 'Kids' }).expect(400);
    });

    it('is hidden again when switched off', async () => {
      await admin('patch', '/admin/dress-code').send({ enabled: false }).expect(200);
      const pub = await request(server()).get('/public/details-page').expect(200);
      expect(pub.body.dressCode).toBeNull();
    });
  });

  it('public endpoints respect "Site is public"', async () => {
    await prisma.weddingSettings.update({ where: { id: 'singleton' }, data: { isPublic: false } });
    await request(server()).get('/public/details-page').expect(503);
    await request(server()).get('/public/calendar.ics').expect(503);
    await prisma.weddingSettings.update({ where: { id: 'singleton' }, data: { isPublic: true } });
  });
});
