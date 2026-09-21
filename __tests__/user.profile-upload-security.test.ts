// Regression coverage for the unrestricted-file-upload vulnerability on
// PATCH /api/users/update-profile: multerConfig.ts had no fileFilter and
// no size limits, and built the on-disk filename from the raw
// client-supplied file.originalname with no sanitization - any file
// type, any size, and a path-traversal-prone filename could all reach
// uploads/documents/ before ever touching Cloudinary.
//
// No model mocks here (deliberately, matching the other __tests__ files'
// reasoning): user.controller.ts imports member.model.ts and
// notification.model.ts, both of which call `belongsTo(User, ...)` at
// module load time - jest.mock()-ing User breaks that at import time.
// These requests run against the real disposable test database, with
// only Cloudinary itself mocked out (no real upload should happen).
import request from 'supertest';
import express, { Express } from 'express';
import fs from 'fs';
import path from 'path';
import userRoutes from '../src/routes/user.route';
import User from '../src/models/user.model';
import { Notification } from '../src/models/notification.model';
import { hashPassword } from '../src/utils/password.utils';
import { generateToken } from '../src/utils/tokenGenerator.utils';

jest.mock('../src/utils/cloudinary.utils', () => ({
  __esModule: true,
  default: {
    uploader: {
      upload: jest.fn().mockResolvedValue({ secure_url: 'https://cloudinary.example/fake.jpg' }),
    },
  },
}));

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/users', userRoutes);
  return app;
}

const uploadDir = path.join(process.cwd(), 'uploads', 'documents');

function listUploadedFiles(): string[] {
  if (!fs.existsSync(uploadDir)) return [];
  return fs.readdirSync(uploadDir);
}

describe('PATCH /api/users/update-profile - upload hardening', () => {
  const email = `profile-upload-security-${Date.now()}@example.com`;
  let userId: string;
  let token: string;
  const filesBefore = new Set<string>();

  beforeAll(async () => {
    const hashed = await hashPassword('OldPassw0rd!23');
    const user = await User.create({
      firstName: 'Upload',
      lastName: 'Target',
      email,
      password: hashed,
    } as any);
    userId = user.getDataValue('id') as string;
    token = await generateToken({
      id: userId,
      email,
      role: 'Member',
      firstName: 'Upload',
    } as any);

    listUploadedFiles().forEach((f) => filesBefore.add(f));
  });

  afterAll(async () => {
    // Clean up whatever this test wrote to uploads/documents/, and only
    // that - never touch files that were already there.
    for (const f of listUploadedFiles()) {
      if (!filesBefore.has(f)) fs.unlinkSync(path.join(uploadDir, f));
    }
    // A successful update creates a Notification row referencing this
    // user (userId FK) - has to go first, or the User delete below hits
    // a foreign-key constraint violation.
    await Notification.destroy({ where: { userId } });
    await User.destroy({ where: { email } });
  });

  it('rejects a non-image file type', async () => {
    const res = await request(buildApp())
      .patch('/api/users/update-profile')
      .set('Authorization', `Bearer ${token}`)
      .attach('images', Buffer.from('not an image'), 'payload.exe');

    expect(res.status).toBe(400);
  });

  it('rejects a file over the 5MB limit', async () => {
    const oversized = Buffer.alloc(6 * 1024 * 1024, 'a');

    const res = await request(buildApp())
      .patch('/api/users/update-profile')
      .set('Authorization', `Bearer ${token}`)
      .attach('images', oversized, 'big.jpg');

    expect(res.status).toBe(400);
  });

  it('accepts a valid image and never uses the raw client filename on disk', async () => {
    const res = await request(buildApp())
      .patch('/api/users/update-profile')
      .set('Authorization', `Bearer ${token}`)
      .field('firstName', 'Upload')
      .field('lastName', 'Target')
      // A path-traversal attempt in the original filename - the fix must
      // never let this reach the filesystem as-is.
      .attach('images', Buffer.from('fake jpg bytes'), '../../../evil.jpg');

    expect(res.status).toBe(200);

    const newFiles = listUploadedFiles().filter((f) => !filesBefore.has(f));
    expect(newFiles.length).toBeGreaterThan(0);
    for (const f of newFiles) {
      expect(f).not.toContain('..');
      expect(f).not.toContain('/');
      expect(f).not.toContain('\\');
      expect(f.endsWith('.jpg')).toBe(true);
    }
  });
});
