import request from 'supertest';
import express, { Express } from 'express';
import jwt from 'jsonwebtoken';
import adminHeroMembersRoutes from '../src/routes/admin/heroMembers.routes';
import HeroFeaturedMember from '../src/models/heroFeaturedMember.model';
import Member from '../src/models/member.model';

// Only HeroFeaturedMember is module-mocked; Member (and its own User
// association) are left real, because heroFeaturedMember.model.ts calls
// `HeroFeaturedMember.belongsTo(Member, ...)` at import time, which needs
// Member to be a genuine Sequelize Model subclass, not an automock.
jest.mock('../src/models/heroFeaturedMember.model');

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminHeroMembersRoutes);
  return app;
}

function adminToken(): string {
  return jwt.sign({ id: 'a1111111-1111-4111-8111-111111111111', role: 'Admin' }, process.env.JWT_SECRET as string, {
    expiresIn: '1h',
  });
}

function memberToken(): string {
  return jwt.sign({ id: 'b2222222-2222-4222-8222-222222222222', role: 'Member' }, process.env.JWT_SECRET as string, {
    expiresIn: '1h',
  });
}

const MEMBER_ID = 'c3333333-3333-4333-8333-333333333333';
const HERO_ID = 'd4444444-4444-4444-8444-444444444444';

function mockMemberRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: MEMBER_ID,
    name: 'Jane Doe',
    role: 'Backend Developer',
    imageUrl: 'https://example.com/jane.jpg',
    bio: 'Should never leak from these endpoints.',
    skills: ['Node.js'],
    ...overrides,
  };
}

function mockHeroRow(overrides: Partial<Record<string, unknown>> = {}) {
  const fields: Record<string, unknown> = {
    id: HERO_ID,
    memberId: MEMBER_ID,
    order: 0,
    Member: { name: 'Jane Doe', imageUrl: 'https://example.com/jane.jpg', role: 'Backend Developer' },
    ...overrides,
  };
  return { ...fields, toJSON: () => fields };
}

afterEach(() => jest.restoreAllMocks());

describe('GET /api/admin/members/picker', () => {
  it('returns 401 without an Authorization header', async () => {
    const res = await request(buildApp()).get('/api/admin/members/picker');
    expect(res.status).toBe(401);
  });

  it('returns 403 for a non-Admin token', async () => {
    const res = await request(buildApp())
      .get('/api/admin/members/picker')
      .set('Authorization', `Bearer ${memberToken()}`);
    expect(res.status).toBe(403);
  });

  it('returns only id, name, imageUrl, role for each member - nothing else', async () => {
    // Simulates real Sequelize behavior: only the columns named in
    // `attributes` come back, exactly like a real SQL projection would -
    // proves the controller's attributes option is doing the actual work,
    // not just that this specific mock happens to omit the fields.
    jest.spyOn(Member, 'findAll').mockImplementation(((options?: { attributes?: string[] }) => {
      const full = mockMemberRow();
      const allowed = options?.attributes ?? Object.keys(full);
      const projected = Object.fromEntries(allowed.map((key) => [key, (full as Record<string, unknown>)[key]]));
      return Promise.resolve([projected]);
    }) as never);

    const res = await request(buildApp())
      .get('/api/admin/members/picker')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.members).toEqual([
      { id: MEMBER_ID, name: 'Jane Doe', role: 'Backend Developer', imageUrl: 'https://example.com/jane.jpg' },
    ]);
    const body = JSON.stringify(res.body).toLowerCase();
    expect(body).not.toContain('bio');
    expect(body).not.toContain('skills');
  });
});

describe('GET /api/admin/hero-members', () => {
  it('returns 401 without an Authorization header', async () => {
    const res = await request(buildApp()).get('/api/admin/hero-members');
    expect(res.status).toBe(401);
  });

  it('returns 403 for a non-Admin token', async () => {
    const res = await request(buildApp())
      .get('/api/admin/hero-members')
      .set('Authorization', `Bearer ${memberToken()}`);
    expect(res.status).toBe(403);
  });

  it('returns featured members ordered by order, projected to id/name/imageUrl/role only', async () => {
    (HeroFeaturedMember.findAll as jest.Mock).mockResolvedValue([mockHeroRow()]);

    const res = await request(buildApp())
      .get('/api/admin/hero-members')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.heroMembers).toEqual([
      { id: HERO_ID, name: 'Jane Doe', imageUrl: 'https://example.com/jane.jpg', role: 'Backend Developer' },
    ]);
  });
});

describe('POST /api/admin/hero-members', () => {
  it('returns 401 without an Authorization header', async () => {
    const res = await request(buildApp()).post('/api/admin/hero-members').send({ memberId: MEMBER_ID });
    expect(res.status).toBe(401);
  });

  it('returns 403 for a non-Admin token', async () => {
    const res = await request(buildApp())
      .post('/api/admin/hero-members')
      .set('Authorization', `Bearer ${memberToken()}`)
      .send({ memberId: MEMBER_ID });
    expect(res.status).toBe(403);
  });

  it('returns 404 when the member does not exist', async () => {
    jest.spyOn(Member, 'findByPk').mockResolvedValue(null as never);

    const res = await request(buildApp())
      .post('/api/admin/hero-members')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ memberId: MEMBER_ID });

    expect(res.status).toBe(404);
  });

  it('returns 409 when the member is already featured', async () => {
    jest.spyOn(Member, 'findByPk').mockResolvedValue(mockMemberRow() as never);
    (HeroFeaturedMember.findOne as jest.Mock).mockResolvedValue(mockHeroRow());

    const res = await request(buildApp())
      .post('/api/admin/hero-members')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ memberId: MEMBER_ID });

    expect(res.status).toBe(409);
  });

  it('adds a new member to the end of the current order and returns only the 3 display fields plus id', async () => {
    jest.spyOn(Member, 'findByPk').mockResolvedValue(mockMemberRow() as never);
    (HeroFeaturedMember.findOne as jest.Mock).mockResolvedValue(null);
    (HeroFeaturedMember.max as jest.Mock).mockResolvedValue(2);
    (HeroFeaturedMember.create as jest.Mock).mockResolvedValue({ id: HERO_ID, memberId: MEMBER_ID, order: 3 });

    const res = await request(buildApp())
      .post('/api/admin/hero-members')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ memberId: MEMBER_ID });

    expect(res.status).toBe(201);
    expect(HeroFeaturedMember.create).toHaveBeenCalledWith(expect.objectContaining({ memberId: MEMBER_ID, order: 3 }));
    expect(res.body.data).toEqual({
      id: HERO_ID,
      name: 'Jane Doe',
      imageUrl: 'https://example.com/jane.jpg',
      role: 'Backend Developer',
    });
  });

  it('rejects a non-uuid memberId with 400', async () => {
    const res = await request(buildApp())
      .post('/api/admin/hero-members')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ memberId: 'not-a-uuid' });

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/admin/hero-members/:id', () => {
  it('returns 401 without an Authorization header', async () => {
    const res = await request(buildApp()).delete(`/api/admin/hero-members/${HERO_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 403 for a non-Admin token', async () => {
    const res = await request(buildApp())
      .delete(`/api/admin/hero-members/${HERO_ID}`)
      .set('Authorization', `Bearer ${memberToken()}`);
    expect(res.status).toBe(403);
  });

  it('returns 404 when the hero member row does not exist', async () => {
    (HeroFeaturedMember.findByPk as jest.Mock).mockResolvedValue(null);

    const res = await request(buildApp())
      .delete(`/api/admin/hero-members/${HERO_ID}`)
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(404);
  });

  it('destroys the HeroFeaturedMember row, never the underlying Member', async () => {
    const destroy = jest.fn().mockResolvedValue(undefined);
    (HeroFeaturedMember.findByPk as jest.Mock).mockResolvedValue({ id: HERO_ID, destroy });

    const res = await request(buildApp())
      .delete(`/api/admin/hero-members/${HERO_ID}`)
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(destroy).toHaveBeenCalled();
  });
});

describe('PATCH /api/admin/hero-members/reorder', () => {
  const idA = 'e5555555-5555-4555-8555-555555555555';
  const idB = 'e6666666-6666-4666-8666-666666666666';

  it('returns 401 without an Authorization header', async () => {
    const res = await request(buildApp()).patch('/api/admin/hero-members/reorder').send([idA, idB]);
    expect(res.status).toBe(401);
  });

  it('returns 403 for a non-Admin token', async () => {
    const res = await request(buildApp())
      .patch('/api/admin/hero-members/reorder')
      .set('Authorization', `Bearer ${memberToken()}`)
      .send([idA, idB]);
    expect(res.status).toBe(403);
  });

  it('rejects a reorder array missing one of the current ids with 400', async () => {
    (HeroFeaturedMember.findAll as jest.Mock).mockResolvedValue([{ id: idA }, { id: idB }]);

    const res = await request(buildApp())
      .patch('/api/admin/hero-members/reorder')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send([idA]);

    expect(res.status).toBe(400);
  });

  it('rejects a reorder array with a duplicate id with 400', async () => {
    (HeroFeaturedMember.findAll as jest.Mock).mockResolvedValue([{ id: idA }, { id: idB }]);

    const res = await request(buildApp())
      .patch('/api/admin/hero-members/reorder')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send([idA, idA]);

    expect(res.status).toBe(400);
  });

  it('rejects a reorder array containing an id not currently featured with 400', async () => {
    (HeroFeaturedMember.findAll as jest.Mock).mockResolvedValue([{ id: idA }]);

    const res = await request(buildApp())
      .patch('/api/admin/hero-members/reorder')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send([idA, idB]);

    expect(res.status).toBe(400);
  });

  it('updates order to match array position when the array matches the current set exactly', async () => {
    (HeroFeaturedMember.findAll as jest.Mock)
      .mockResolvedValueOnce([{ id: idA }, { id: idB }]) // current-set check
      .mockResolvedValueOnce([
        { ...mockHeroRow({ id: idB, order: 0 }) },
        { ...mockHeroRow({ id: idA, order: 1 }) },
      ]); // post-update re-fetch
    (HeroFeaturedMember.update as jest.Mock).mockResolvedValue([1]);

    const res = await request(buildApp())
      .patch('/api/admin/hero-members/reorder')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send([idB, idA]);

    expect(res.status).toBe(200);
    expect(HeroFeaturedMember.update).toHaveBeenCalledWith({ order: 0 }, expect.objectContaining({ where: { id: idB } }));
    expect(HeroFeaturedMember.update).toHaveBeenCalledWith({ order: 1 }, expect.objectContaining({ where: { id: idA } }));
  });
});
