import request from 'supertest';
import express, { Express } from 'express';
import alumniRoutes from '../src/routes/alumni.routes';
import Member from '../src/models/member.model';
import Alumnus from '../src/models/alumnus.model';

// Both Member and Alumnus are module-mocked; User is left real, because
// member.model.ts calls `Member.belongsTo(User, ...)` and alumnus.model.ts
// calls `Alumnus.belongsTo(User, ...)` at import time, which needs User to
// be a genuine Sequelize Model subclass, not an automock. Member and
// Alumnus don't reference each other, so mocking both together is safe.
jest.mock('../src/models/member.model');
jest.mock('../src/models/alumnus.model');

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/alumni', alumniRoutes);
  return app;
}

function mockAlumniMember(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    name: 'Jane Doe',
    imageUrl: 'https://example.com/jane.jpg',
    role: 'Backend Developer',
    alumniSince: new Date('2024-06-01T00:00:00.000Z'),
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
    userId: 'should-never-leak',
    isAlumni: true,
    ...overrides,
  };
}

function mockStandaloneAlumnus(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    fullName: 'John Smith',
    imageUrl: 'https://example.com/john.jpg',
    role: 'Frontend Developer',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    cloudinaryPublicId: 'should-never-leak',
    createdBy: 'should-never-leak',
    ...overrides,
  };
}

afterEach(() => jest.clearAllMocks());

describe('GET /api/alumni (public)', () => {
  it('returns 200 without an Authorization header', async () => {
    (Member.findAll as jest.Mock).mockResolvedValue([]);
    (Alumnus.findAll as jest.Mock).mockResolvedValue([]);

    const res = await request(buildApp()).get('/api/alumni');

    expect(res.status).toBe(200);
  });

  it('returns an empty list when there are no alumni from either source', async () => {
    (Member.findAll as jest.Mock).mockResolvedValue([]);
    (Alumnus.findAll as jest.Mock).mockResolvedValue([]);

    const res = await request(buildApp()).get('/api/alumni');

    expect(res.status).toBe(200);
    expect(res.body.data.alumni).toEqual([]);
  });

  it('combines both sources, projected to only name/imageUrl/role', async () => {
    (Member.findAll as jest.Mock).mockResolvedValue([mockAlumniMember()]);
    (Alumnus.findAll as jest.Mock).mockResolvedValue([mockStandaloneAlumnus()]);

    const res = await request(buildApp()).get('/api/alumni');

    expect(res.status).toBe(200);
    expect(res.body.data.alumni).toEqual(
      expect.arrayContaining([
        { name: 'Jane Doe', imageUrl: 'https://example.com/jane.jpg', role: 'Backend Developer' },
        { name: 'John Smith', imageUrl: 'https://example.com/john.jpg', role: 'Frontend Developer' },
      ])
    );
    expect(res.body.data.alumni).toHaveLength(2);

    // Confirms Member.findAll was scoped to isAlumni: true only.
    expect(Member.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { isAlumni: true } }));
  });

  it('never leaks internal-only fields from either source', async () => {
    (Member.findAll as jest.Mock).mockResolvedValue([mockAlumniMember()]);
    (Alumnus.findAll as jest.Mock).mockResolvedValue([mockStandaloneAlumnus()]);

    const res = await request(buildApp()).get('/api/alumni');

    const body = JSON.stringify(res.body).toLowerCase();
    expect(body).not.toContain('should-never-leak');
    expect(body).not.toContain('useri');
    expect(body).not.toContain('isalumni');
    expect(body).not.toContain('alumnisince');
    expect(body).not.toContain('cloudinarypublicid');
    expect(body).not.toContain('createdby');
    expect(body).not.toContain('createdat');
  });

  it('sorts the combined list by most recently added first (alumniSince/createdAt descending)', async () => {
    (Member.findAll as jest.Mock).mockResolvedValue([
      mockAlumniMember({ name: 'Oldest Member', alumniSince: new Date('2022-01-01T00:00:00.000Z') }),
      mockAlumniMember({ name: 'Newest Member', alumniSince: new Date('2025-01-01T00:00:00.000Z') }),
    ]);
    (Alumnus.findAll as jest.Mock).mockResolvedValue([
      mockStandaloneAlumnus({ fullName: 'Middle Alumnus', createdAt: new Date('2023-06-01T00:00:00.000Z') }),
    ]);

    const res = await request(buildApp()).get('/api/alumni');

    expect(res.body.data.alumni.map((entry: { name: string }) => entry.name)).toEqual([
      'Newest Member',
      'Middle Alumnus',
      'Oldest Member',
    ]);
  });
});
