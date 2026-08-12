import request from 'supertest';
import express, { Express } from 'express';
import projectRoutes from '../src/routes/project.routes';
import Project from '../src/models/project.model';

// Only Project is module-mocked; User is left real because
// project.model.ts calls `Project.belongsTo(User, ...)` at import time,
// which requires User to be an actual Sequelize Model subclass.
jest.mock('../src/models/project.model');

const PROJECT_ID = 'c3333333-3333-4333-8333-333333333333';

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/projects', projectRoutes);
  return app;
}

function mockProjectRow(overrides: Partial<Record<string, unknown>> = {}) {
  const fields = {
    id: PROJECT_ID,
    userId: 'd4444444-4444-4444-8444-444444444444',
    title: 'Campus Ride Share',
    description: 'A carpooling app for students.',
    owner: 'Jane Doe',
    ownerRole: 'Backend Developer',
    ownerAvatar: 'https://example.com/jane.jpg',
    image: 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=600',
    link: 'https://github.com/jane/rideshare',
    demo: 'https://rideshare.example.com',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
    ...overrides,
  };
  return { ...fields, toJSON: () => fields };
}

describe('GET /api/projects (public list)', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns 200 without an Authorization header', async () => {
    (Project.findAndCountAll as jest.Mock).mockResolvedValue({ count: 0, rows: [] });

    const res = await request(buildApp()).get('/api/projects');

    expect(res.status).toBe(200);
  });

  it('includes owner display info but never an owner email', async () => {
    (Project.findAndCountAll as jest.Mock).mockResolvedValue({
      count: 1,
      rows: [mockProjectRow()],
    });

    const res = await request(buildApp()).get('/api/projects');

    expect(res.status).toBe(200);
    const [project] = res.body.data.projects;
    expect(project).toMatchObject({
      owner: 'Jane Doe',
      ownerRole: 'Backend Developer',
      ownerAvatar: 'https://example.com/jane.jpg',
    });
    const body = JSON.stringify(res.body).toLowerCase();
    expect(body).not.toContain('email');
  });
});

describe('GET /api/projects/project/:id (public detail)', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns the project with owner info and no email', async () => {
    (Project.findByPk as jest.Mock).mockResolvedValue(mockProjectRow());

    const res = await request(buildApp()).get(`/api/projects/project/${PROJECT_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.project).toMatchObject({
      owner: 'Jane Doe',
      ownerRole: 'Backend Developer',
    });
    const body = JSON.stringify(res.body).toLowerCase();
    expect(body).not.toContain('email');
  });

  it('returns 404 for a non-existent project id', async () => {
    (Project.findByPk as jest.Mock).mockResolvedValue(null);

    const res = await request(buildApp()).get(`/api/projects/project/${PROJECT_ID}`);

    expect(res.status).toBe(404);
  });
});
