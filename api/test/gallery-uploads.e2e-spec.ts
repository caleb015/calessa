import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { signParams } from '../src/uploads/cloudinary';

const ADMIN_EMAIL = 'e2e+gallery@example.com';
const ADMIN_PASSWORD = 'e2e-password-123';
const CODE = 'GALLERY1';
const SECRET = 'topsecret';

/** A finished upload as Cloudinary would report it, signed with our (test) secret. */
const uploaded = (name: string, folder = 'calessa/guest-uploads', secret = SECRET) => {
  const publicId = `${folder}/${name}`;
  const version = 1794550000;
  return { publicId, version, format: 'jpg', signature: signParams({ public_id: publicId, version }, secret) };
};

describe('Guest gallery uploads (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let guestId: string;
  const originalCloudinary = process.env.CLOUDINARY_URL;
  const server = () => app.getHttpServer();

  const setSettings = (data: { uploadsEnabled?: boolean; requireApproval?: boolean }) =>
    request(server()).patch('/admin/gallery-settings').set('Authorization', token).send(data).expect(200);
  const setPublic = (isPublic: boolean) =>
    prisma.weddingSettings.upsert({ where: { id: 'singleton' }, update: { isPublic }, create: { id: 'singleton', isPublic } });
  const cleanup = async () => {
    await prisma.galleryImage.deleteMany({ where: { imageUrl: { contains: 'demo-cloud' } } });
    await prisma.guest.deleteMany({ where: { invitationCode: CODE } });
    await prisma.gallerySettings.deleteMany({});
    await prisma.user.deleteMany({ where: { email: ADMIN_EMAIL } });
  };

  beforeAll(async () => {
    process.env.CLOUDINARY_URL = `cloudinary://111222333:${SECRET}@demo-cloud`;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = moduleRef.get(PrismaService);
    await cleanup();
    await setPublic(true);

    guestId = (await prisma.guest.create({ data: { primaryName: 'Maria Santos', email: 'maria@example.com', invitationCode: CODE } })).id;
    await request(server()).post('/auth/register').send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    const res = await request(server()).post('/auth/login').send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }).expect(201);
    token = `Bearer ${res.body.access_token}`;
  });

  afterAll(async () => {
    await cleanup();
    await setPublic(true);
    if (originalCloudinary === undefined) delete process.env.CLOUDINARY_URL;
    else process.env.CLOUDINARY_URL = originalCloudinary;
    await app.close();
  });

  describe('admin settings', () => {
    it('requires login', () => request(server()).get('/admin/gallery-settings').expect(401));

    it('returns defaults without creating a row', async () => {
      const res = await request(server()).get('/admin/gallery-settings').set('Authorization', token).expect(200);
      expect(res.body).toMatchObject({ uploadsEnabled: true, requireApproval: true, heading: '', buttonLabel: '' });
      expect(res.body.defaults.heading).toMatch(/memories/i);
      expect(await prisma.gallerySettings.count()).toBe(0);
    });

    it('saves custom wording, used on the public gallery', async () => {
      await request(server()).patch('/admin/gallery-settings').set('Authorization', token)
        .send({ heading: 'Show us your photos!', buttonLabel: 'Upload photos' }).expect(200);
      const pub = await request(server()).get('/public/gallery-settings').expect(200);
      expect(pub.body).toMatchObject({ uploadsEnabled: true, heading: 'Show us your photos!', buttonLabel: 'Upload photos' });
      expect(pub.body.subtext).toMatch(/invitation code/);
    });

    it('rejects unknown fields', () =>
      request(server()).patch('/admin/gallery-settings').set('Authorization', token).send({ secret: 'x' }).expect(400));
  });

  describe('invitation code check', () => {
    it('returns only the guest name for a valid code (any letter case)', async () => {
      const res = await request(server()).post('/public/gallery-uploads/verify').send({ code: ' gallery1 ' }).expect(200);
      expect(res.body).toEqual({ name: 'Maria Santos' });
    });

    it('rejects unknown codes', () =>
      request(server()).post('/public/gallery-uploads/verify').send({ code: 'NOPE0000' }).expect(404));

    it('signs uploads into the guest folder only for a valid code, without exposing the secret', async () => {
      await request(server()).post('/public/gallery-uploads/signature').send({ code: 'NOPE0000' }).expect(404);
      const res = await request(server()).post('/public/gallery-uploads/signature').send({ code: CODE }).expect(200);
      expect(res.body).toMatchObject({ cloudName: 'demo-cloud', folder: 'calessa/guest-uploads' });
      expect(JSON.stringify(res.body)).not.toContain(SECRET);
    });
  });

  describe('adding photos', () => {
    it('rejects forged, foreign-account and wrong-folder uploads', async () => {
      for (const image of [
        { ...uploaded('forged'), signature: 'a'.repeat(40) },
        uploaded('other-account', 'calessa/guest-uploads', 'someone-elses-secret'),
        uploaded('admin-folder', 'calessa'),
      ]) {
        await request(server()).post('/public/gallery-uploads').send({ code: CODE, images: [image] }).expect(400);
      }
      expect(await prisma.galleryImage.count({ where: { guestId } })).toBe(0);
    });

    it('keeps photos pending when approval is required', async () => {
      await setSettings({ requireApproval: true });
      const res = await request(server()).post('/public/gallery-uploads')
        .send({ code: CODE, images: [uploaded('one'), uploaded('two')] }).expect(201);
      expect(res.body).toEqual({ added: 2, pendingApproval: true });

      const pub = await request(server()).get('/public/gallery').expect(200);
      expect(pub.body.some((i: any) => i.imageUrl.includes('guest-uploads/one'))).toBe(false);

      const admin = await request(server()).get('/admin/gallery').set('Authorization', token).expect(200);
      const one = admin.body.find((i: any) => i.imageUrl.includes('guest-uploads/one'));
      expect(one).toMatchObject({ isPublished: false, guest: { primaryName: 'Maria Santos' } });
      expect(one.imageUrl).toBe('https://res.cloudinary.com/demo-cloud/image/upload/f_auto,q_auto,c_limit,w_2400/v1794550000/calessa/guest-uploads/one.jpg');
    });

    it('shows approved photos credited to the guest', async () => {
      const admin = await request(server()).get('/admin/gallery').set('Authorization', token).expect(200);
      const one = admin.body.find((i: any) => i.imageUrl.includes('guest-uploads/one'));
      // The dashboard publishes with the edit form's fields only
      await request(server()).patch(`/admin/gallery/${one.id}`).set('Authorization', token).send({ isPublished: true }).expect(200);

      const pub = await request(server()).get('/public/gallery').expect(200);
      const shown = pub.body.find((i: any) => i.id === one.id);
      expect(shown).toMatchObject({ sharedBy: 'Maria Santos' });
      expect(shown).not.toHaveProperty('guestId');
      expect(shown).not.toHaveProperty('guest');
    });

    it('publishes immediately when approval is off', async () => {
      await setSettings({ requireApproval: false });
      const res = await request(server()).post('/public/gallery-uploads').send({ code: CODE, images: [uploaded('three')] }).expect(201);
      expect(res.body).toEqual({ added: 1, pendingApproval: false });
      const pub = await request(server()).get('/public/gallery').expect(200);
      expect(pub.body.some((i: any) => i.imageUrl.includes('guest-uploads/three'))).toBe(true);
    });

    it('puts guest photos in the gallery only, never on the homepage', async () => {
      const admin = await request(server()).get('/admin/gallery').set('Authorization', token).expect(200);
      const guestPhotos = admin.body.filter((i: any) => i.imageUrl.includes('guest-uploads/'));
      expect(guestPhotos.length).toBeGreaterThan(0);
      guestPhotos.forEach((p: any) => expect(p.showOnHomepage).toBe(false));
      const home = await request(server()).get('/public/gallery/homepage?limit=48').expect(200);
      expect(home.body.images.some((i: any) => i.imageUrl.includes('guest-uploads/'))).toBe(false);
    });

    it('ignores photos submitted twice', async () => {
      const res = await request(server()).post('/public/gallery-uploads').send({ code: CODE, images: [uploaded('three')] }).expect(201);
      expect(res.body.added).toBe(0);
      expect(await prisma.galleryImage.count({ where: { guestId } })).toBe(3);
    });

    it('limits how many photos one request can add', async () => {
      const images = Array.from({ length: 31 }, (_, i) => uploaded(`bulk-${i}`));
      await request(server()).post('/public/gallery-uploads').send({ code: CODE, images }).expect(400);
    });

    it('is closed when uploads are switched off', async () => {
      await setSettings({ uploadsEnabled: false });
      await request(server()).post('/public/gallery-uploads/verify').send({ code: CODE }).expect(403);
      await request(server()).post('/public/gallery-uploads').send({ code: CODE, images: [uploaded('four')] }).expect(403);
      await setSettings({ uploadsEnabled: true });
    });

    it('is unavailable while the site is private, except in admin preview', async () => {
      await setPublic(false);
      await request(server()).post('/public/gallery-uploads/verify').send({ code: CODE }).expect(503);
      const { body } = await request(server()).post('/admin/preview-token').set('Authorization', token).expect(201);
      await request(server()).post('/public/gallery-uploads/verify').set('X-Preview-Token', body.token).send({ code: CODE }).expect(200);
      await setPublic(true);
    });

    it("keeps a guest's photos when the guest is deleted", async () => {
      await request(server()).delete(`/admin/guests/${guestId}`).set('Authorization', token).expect(204);
      const rows = await prisma.galleryImage.findMany({ where: { imageUrl: { contains: 'demo-cloud' } } });
      expect(rows).toHaveLength(3);
      expect(rows.every(r => r.guestId === null)).toBe(true);
    });
  });
});
