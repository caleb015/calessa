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

    // Defensive baseline: another spec file may have left isPublic flipped off,
    // which the test DB persists across separate `npm run test:e2e` invocations.
    await prisma.weddingSettings.upsert({
      where: { id: 'singleton' },
      update: { isPublic: true },
      create: { id: 'singleton', isPublic: true },
    });

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
    // This file's own "updates scalar fields" test sets isPublic to false —
    // restore it so later spec files/runs don't inherit a "site offline" state.
    await prisma.weddingSettings.update({ where: { id: 'singleton' }, data: { isPublic: true } });
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

  // ── Wedding date → event date sync ───────────────────────────────────────────

  describe('PATCH /admin/settings weddingDate syncs event dates', () => {
    const TITLE_PREFIX = 'E2E Sync';
    let ceremonyId: string;
    let receptionId: string;

    beforeEach(async () => {
      await prisma.weddingEvent.deleteMany({ where: { title: { startsWith: TITLE_PREFIX } } });
      // Jan 1 2027 in Manila: ceremony 1:00–2:00 AM, reception 3:00 PM – 1:00 AM next day
      const ceremony = await prisma.weddingEvent.create({
        data: {
          tagline: 'Ceremony', title: `${TITLE_PREFIX} Ceremony`,
          startTime: new Date('2026-12-31T17:00:00.000Z'), endTime: new Date('2026-12-31T18:00:00.000Z'),
        },
      });
      const reception = await prisma.weddingEvent.create({
        data: {
          tagline: 'Reception', title: `${TITLE_PREFIX} Reception`,
          startTime: new Date('2027-01-01T07:00:00.000Z'), endTime: new Date('2027-01-01T17:00:00.000Z'),
        },
      });
      ceremonyId = ceremony.id;
      receptionId = reception.id;
    });

    afterAll(async () => {
      await prisma.weddingEvent.deleteMany({ where: { title: { startsWith: TITLE_PREFIX } } });
    });

    it('moves events to the new date in Manila, keeping time of day and duration', async () => {
      await request(app.getHttpServer())
        .patch('/admin/settings')
        .set('Authorization', token)
        .send({ weddingDate: '2027-02-12T07:00:00.000Z' }) // Feb 12, 3:00 PM Manila
        .expect(200);

      const ceremony = await prisma.weddingEvent.findUniqueOrThrow({ where: { id: ceremonyId } });
      const reception = await prisma.weddingEvent.findUniqueOrThrow({ where: { id: receptionId } });

      expect(ceremony.startTime!.toISOString()).toBe('2027-02-11T17:00:00.000Z'); // Feb 12, 1:00 AM Manila
      expect(ceremony.endTime!.toISOString()).toBe('2027-02-11T18:00:00.000Z');
      expect(reception.startTime!.toISOString()).toBe('2027-02-12T07:00:00.000Z'); // Feb 12, 3:00 PM Manila
      expect(reception.endTime!.toISOString()).toBe('2027-02-12T17:00:00.000Z'); // Feb 13, 1:00 AM Manila
    });

    it('leaves events alone when the update does not include weddingDate', async () => {
      await request(app.getHttpServer())
        .patch('/admin/settings')
        .set('Authorization', token)
        .send({ siteTitle: 'E2E sync check' })
        .expect(200);

      const ceremony = await prisma.weddingEvent.findUniqueOrThrow({ where: { id: ceremonyId } });
      expect(ceremony.startTime!.toISOString()).toBe('2026-12-31T17:00:00.000Z');
    });

    it('does not move events when the settings update is rejected', async () => {
      await request(app.getHttpServer())
        .patch('/admin/settings')
        .set('Authorization', token)
        .send({ weddingDate: 'not-a-date' })
        .expect(400);

      const ceremony = await prisma.weddingEvent.findUniqueOrThrow({ where: { id: ceremonyId } });
      expect(ceremony.startTime!.toISOString()).toBe('2026-12-31T17:00:00.000Z');
    });
  });

  // ── Homepage photos ──────────────────────────────────────────────────────────

  describe('homepage photos', () => {
    const WELCOME = 'https://res.cloudinary.com/demo/image/upload/v1/calessa/welcome.jpg';
    const BANNER = 'https://res.cloudinary.com/demo/image/upload/v1/calessa/banner.jpg';
    const patch = (body: object) => request(app.getHttpServer()).patch('/admin/settings').set('Authorization', token).send(body);

    afterAll(async () => {
      await prisma.weddingSettings.update({ where: { id: 'singleton' }, data: { welcomeImageUrl: null, rsvpBannerImageUrl: null, rsvpHeading: null, fontHeading: null, fontHeadingUrl: null, fontBody: null, fontBodyUrl: null, fontAccent: null, fontAccentUrl: null, fontHero: null, fontHeroUrl: null, heroTextAlign: null, heroTextOffset: null, heroMobileImageUrl: null, heroMobileImageOffsetY: null, heroTextOffsetY: null, heroMobileTextOffsetY: null } });
    });

    it('saves the welcome and RSVP banner photos and shows them on the public site', async () => {
      await patch({ welcomeImageUrl: WELCOME, rsvpBannerImageUrl: BANNER }).expect(200);
      const pub = await request(app.getHttpServer()).get('/public/settings').expect(200);
      expect(pub.body).toMatchObject({ welcomeImageUrl: WELCOME, rsvpBannerImageUrl: BANNER });
    });

    it('removes a photo when its field is emptied', async () => {
      await patch({ welcomeImageUrl: WELCOME }).expect(200);
      const res = await patch({ welcomeImageUrl: '' }).expect(200);
      expect(res.body.welcomeImageUrl).toBeNull();
    });

    it.each(['not a link', 'javascript:alert(1)', 'ftp://example.com/a.jpg'])('rejects %s as a photo link', bad =>
      patch({ rsvpBannerImageUrl: bad }).expect(400));

    it('saves the RSVP page heading, shows it on the public site, and limits its length', async () => {
      await patch({ rsvpHeading: 'Join us in Antipolo' }).expect(200);
      expect((await request(app.getHttpServer()).get('/public/settings').expect(200)).body.rsvpHeading).toBe('Join us in Antipolo');
      await patch({ rsvpHeading: 'x'.repeat(101) }).expect(400);
      await patch({ rsvpHeading: '' }).expect(200);
    });

    it('saves fonts (a Google Fonts name, or an uploaded file) and shows them on the public site', async () => {
      const file = 'https://res.cloudinary.com/demo/raw/upload/v1/calessa/fonts/slopes.ttf';
      await patch({ fontHeading: 'Cormorant Garamond', fontAccent: 'Slopes', fontAccentUrl: file }).expect(200);
      const pub = (await request(app.getHttpServer()).get('/public/settings').expect(200)).body;
      expect(pub).toMatchObject({ fontHeading: 'Cormorant Garamond', fontHeadingUrl: null, fontAccent: 'Slopes', fontAccentUrl: file, fontBody: null });
    });

    it('saves a font just for the names on the homepage photo, and goes back to the headings font when emptied', async () => {
      await patch({ fontHeading: '', fontHero: 'WindSong' }).expect(200);
      expect((await request(app.getHttpServer()).get('/public/settings').expect(200)).body)
        .toMatchObject({ fontHeading: null, fontHero: 'WindSong', fontHeroUrl: null });
      const file = 'https://res.cloudinary.com/demo/raw/upload/v1/calessa/fonts/windsong.woff2';
      expect((await patch({ fontHeroUrl: file }).expect(200)).body.fontHeroUrl).toBe(file);
      expect((await patch({ fontHero: '', fontHeroUrl: '' }).expect(200)).body).toMatchObject({ fontHero: null, fontHeroUrl: null });
      await patch({ fontHero: 'WindSong; color: red' }).expect(400);
      await patch({ fontHeroUrl: 'https://example.com/font.exe' }).expect(400);
    });

    it('goes back to the default font when a font field is emptied', async () => {
      await patch({ fontBody: 'Jost' }).expect(200);
      const res = await patch({ fontBody: '', fontAccent: '', fontAccentUrl: '' }).expect(200);
      expect(res.body).toMatchObject({ fontBody: null, fontAccent: null, fontAccentUrl: null });
    });

    it.each([
      ['fontHeading', 'Lora; color: red'],
      ['fontHeading', '"Lora"'],
      ['fontBody', 'x'.repeat(61)],
      ['fontAccentUrl', 'http://example.com/font.ttf'],
      ['fontAccentUrl', 'https://example.com/font.exe'],
      ['fontAccentUrl', 'https://example.com/a.ttf") ; x(url'],
    ])('rejects %s = %s', (key, value) => patch({ [key]: value }).expect(400));

    it('saves where the hero text sits and shows it on the public site', async () => {
      await patch({ heroTextAlign: 'left', heroTextOffset: '120px' }).expect(200);
      expect((await request(app.getHttpServer()).get('/public/settings').expect(200)).body)
        .toMatchObject({ heroTextAlign: 'left', heroTextOffset: '120px' });
      for (const offset of ['-10%', '12.5%', '0', '80']) await patch({ heroTextOffset: offset }).expect(200);
      for (const align of ['center', 'right', 'justify']) await patch({ heroTextAlign: align }).expect(200);
    });

    it('saves a separate hero photo for phones, shows it on the public site, and removes it when emptied', async () => {
      const phone = 'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_2400/v1/calessa/phone-hero.jpg';
      await patch({ heroMobileImageUrl: phone }).expect(200);
      expect((await request(app.getHttpServer()).get('/public/settings').expect(200)).body).toMatchObject({ heroMobileImageUrl: phone });
      expect((await patch({ heroMobileImageUrl: '' }).expect(200)).body.heroMobileImageUrl).toBeNull();
      await patch({ heroMobileImageUrl: 'not a link' }).expect(400);
    });

    it('saves a vertical photo offset for phones, and clears it', async () => {
      await patch({ heroMobileImageOffsetY: 20 }).expect(200);
      expect((await request(app.getHttpServer()).get('/public/settings').expect(200)).body).toMatchObject({ heroMobileImageOffsetY: 20 });
      for (const edge of [-50, 50]) await patch({ heroMobileImageOffsetY: edge }).expect(200);
      expect((await patch({ heroMobileImageOffsetY: null }).expect(200)).body.heroMobileImageOffsetY).toBeNull();
      for (const bad of [51, -51, 2.5]) await patch({ heroMobileImageOffsetY: bad }).expect(400);
    });

    it('saves a phone-only vertical position for the hero text, and clears it', async () => {
      await patch({ heroTextOffsetY: '10%', heroMobileTextOffsetY: '-60px' }).expect(200);
      expect((await request(app.getHttpServer()).get('/public/settings').expect(200)).body)
        .toMatchObject({ heroTextOffsetY: '10%', heroMobileTextOffsetY: '-60px' });
      expect((await patch({ heroMobileTextOffsetY: '' }).expect(200)).body).toMatchObject({ heroMobileTextOffsetY: null, heroTextOffsetY: '10%' });
      for (const bad of ['10vh', '10px; top: 0']) await patch({ heroMobileTextOffsetY: bad }).expect(400);
    });

    it('saves a vertical position for the hero text, and clears it', async () => {
      for (const offset of ['40px', '-10%', '0', '12.5%']) await patch({ heroTextOffsetY: offset }).expect(200);
      expect((await request(app.getHttpServer()).get('/public/settings').expect(200)).body).toMatchObject({ heroTextOffsetY: '12.5%' });
      expect((await patch({ heroTextOffsetY: '' }).expect(200)).body.heroTextOffsetY).toBeNull();
      for (const bad of ['10vh', '10px; top: 0', 'calc(10%)']) await patch({ heroTextOffsetY: bad }).expect(400);
    });

    it('goes back to the default hero text placement when emptied', async () => {
      await patch({ heroTextAlign: 'right', heroTextOffset: '5%' }).expect(200);
      const res = await patch({ heroTextAlign: '', heroTextOffset: '' }).expect(200);
      expect(res.body).toMatchObject({ heroTextAlign: null, heroTextOffset: null });
    });

    it.each([
      ['heroTextAlign', 'middle'],
      ['heroTextAlign', 'LEFT'],
      ['heroTextOffset', '10em'],
      ['heroTextOffset', '10 px'],
      ['heroTextOffset', 'calc(100% - 10px)'],
      ['heroTextOffset', '10px; color: red'],
      ['heroTextOffset', '99999px'],
    ])('rejects %s = %s', (key, value) => patch({ [key]: value }).expect(400));

    it('turns random order for the homepage photos on and off', async () => {
      expect((await patch({ homepageGalleryShuffle: true }).expect(200)).body.homepageGalleryShuffle).toBe(true);
      expect((await patch({ homepageGalleryShuffle: false }).expect(200)).body.homepageGalleryShuffle).toBe(false);
      await patch({ homepageGalleryShuffle: 'yes' }).expect(400);
    });
  });

  // ── What the dashboard Settings page does on Save ────────────────────────────

  describe('GET → PATCH round trip', () => {
    it('does not expose invite email template fields', async () => {
      const res = await request(app.getHttpServer()).get('/admin/settings').set('Authorization', token).expect(200);
      expect(Object.keys(res.body).filter(k => k.startsWith('invite'))).toEqual([]);
    });

    it('accepts the GET response sent straight back, as the Settings page does', async () => {
      const res = await request(app.getHttpServer()).get('/admin/settings').set('Authorization', token).expect(200);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, createdAt, updatedAt, ...payload } = res.body;
      await request(app.getHttpServer())
        .patch('/admin/settings')
        .set('Authorization', token)
        .send({ ...payload, isPublic: true })
        .expect(200);
    });
  });
});
