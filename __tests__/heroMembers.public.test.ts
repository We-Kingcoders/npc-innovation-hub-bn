import request from 'supertest';
import express, { Express } from 'express';
import heroMembersRoutes from '../src/routes/heroMembers.routes';
import HeroFeaturedMember from '../src/models/heroFeaturedMember.model';

// Only HeroFeaturedMember is module-mocked; Member is left real, because
// heroFeaturedMember.model.ts calls `HeroFeaturedMember.belongsTo(Member, ...)`
// at import time, which needs Member to be a genuine Sequelize Model
// subclass, not an automock (see admin.heroMembers.test.ts for the same
// reasoning).
jest.mock('../src/models/heroFeaturedMember.model');

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/hero-members', heroMembersRoutes);
  return app;
}

function mockHeroRow(overrides: Partial<Record<string, unknown>> = {}) {
  const fields: Record<string, unknown> = {
    id: 'f1111111-1111-4111-8111-111111111111',
    memberId: 'f2222222-2222-4222-8222-222222222222',
    order: 0,
    Member: { name: 'Jane Doe', imageUrl: 'https://example.com/jane.jpg', role: 'Backend Developer' },
    ...overrides,
  };
  return { ...fields, toJSON: () => fields };
}

describe('GET /api/hero-members (public)', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns 200 without an Authorization header', async () => {
    (HeroFeaturedMember.findAll as jest.Mock).mockResolvedValue([]);

    const res = await request(buildApp()).get('/api/hero-members');

    expect(res.status).toBe(200);
  });

  it('returns featured members in order, projected to only name/imageUrl/role - no HeroFeaturedMember id', async () => {
    (HeroFeaturedMember.findAll as jest.Mock).mockResolvedValue([
      mockHeroRow({
        order: 0,
        Member: { name: 'Jane Doe', imageUrl: 'https://example.com/jane.jpg', role: 'Backend Developer' },
      }),
      mockHeroRow({
        id: 'f3333333-3333-4333-8333-333333333333',
        order: 1,
        Member: { name: 'John Smith', imageUrl: 'https://example.com/john.jpg', role: 'Frontend Developer' },
      }),
    ]);

    const res = await request(buildApp()).get('/api/hero-members');

    expect(res.status).toBe(200);
    expect(res.body.data.heroMembers).toEqual([
      { name: 'Jane Doe', imageUrl: 'https://example.com/jane.jpg', role: 'Backend Developer' },
      { name: 'John Smith', imageUrl: 'https://example.com/john.jpg', role: 'Frontend Developer' },
    ]);
    const body = JSON.stringify(res.body).toLowerCase();
    expect(body).not.toContain('f1111111-1111-4111-8111-111111111111');
    expect(body).not.toContain('memberid');
    expect(body).not.toContain('bio');
    expect(body).not.toContain('skills');
    expect(body).not.toContain('email');
  });

  it('returns an empty list when no members are featured', async () => {
    (HeroFeaturedMember.findAll as jest.Mock).mockResolvedValue([]);

    const res = await request(buildApp()).get('/api/hero-members');

    expect(res.status).toBe(200);
    expect(res.body.data.heroMembers).toEqual([]);
  });
});
