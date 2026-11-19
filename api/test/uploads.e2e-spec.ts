import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { signParams } from '../src/uploads/cloudinary';

const ADMIN_EMAIL = 'e2e+uploads@example.com';
const ADMIN_PASSWORD = 'e2e-password-123';

describe('Image upload signature (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  const original = process.env.CLOUDINARY_URL;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = moduleRef.get(PrismaService);
    await prisma.user.deleteMany({ where: { email: ADMIN_EMAIL } });
    await request(app.getHttpServer()).post('/auth/register').send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    const res = await request(app.getHttpServer()).post('/auth/login').send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }).expect(201);
    token = `Bearer ${res.body.access_token}`;
  });

  afterAll(async () => {
    if (original === undefined) delete process.env.CLOUDINARY_URL;
    else process.env.CLOUDINARY_URL = original;
    await prisma.user.deleteMany({ where: { email: ADMIN_EMAIL } });
    await app.close();
  });

  it('requires login', () => request(app.getHttpServer()).post('/admin/uploads/signature').expect(401));

  it('returns 503 with a clear message when Cloudinary is not configured', async () => {
    delete process.env.CLOUDINARY_URL;
    const res = await request(app.getHttpServer()).post('/admin/uploads/signature').set('Authorization', token).expect(503);
    expect(res.body.message).toMatch(/CLOUDINARY_URL/);
  });

  it('returns a valid signature without exposing the secret', async () => {
    process.env.CLOUDINARY_URL = 'cloudinary://111222333:topsecret@demo-cloud';
    const res = await request(app.getHttpServer()).post('/admin/uploads/signature').set('Authorization', token).expect(201);

    expect(res.body).toMatchObject({ cloudName: 'demo-cloud', apiKey: '111222333', folder: 'calessa' });
    expect(JSON.stringify(res.body)).not.toContain('topsecret');
    const { allowed_formats, folder, timestamp } = res.body;
    expect(res.body.signature).toBe(signParams({ allowed_formats, folder, timestamp }, 'topsecret'));
    expect(res.body.allowed_formats).not.toMatch(/ttf|woff/);
  });

  it('signs font file uploads into the fonts folder, as raw files, for font formats only', async () => {
    process.env.CLOUDINARY_URL = 'cloudinary://111222333:topsecret@demo-cloud';
    const res = await request(app.getHttpServer()).post('/admin/uploads/signature').set('Authorization', token)
      .send({ kind: 'font' }).expect(201);
    expect(res.body).toMatchObject({ folder: 'calessa/fonts', allowed_formats: 'woff2,woff,ttf,otf', resourceType: 'raw' });
    expect(JSON.stringify(res.body)).not.toContain('topsecret');
    const { allowed_formats, folder, timestamp } = res.body;
    expect(res.body.signature).toBe(signParams({ allowed_formats, folder, timestamp }, 'topsecret'));
  });

  it('rejects unknown upload kinds', async () => {
    process.env.CLOUDINARY_URL = 'cloudinary://111222333:topsecret@demo-cloud';
    await request(app.getHttpServer()).post('/admin/uploads/signature').set('Authorization', token).send({ kind: 'video' }).expect(400);
  });

  it('requires login for font uploads too', () =>
    request(app.getHttpServer()).post('/admin/uploads/signature').send({ kind: 'font' }).expect(401));
});
