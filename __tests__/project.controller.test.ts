import { Request, Response } from 'express';
import { deleteProject, updateProject } from '../src/controllers/project.controller';
import Project from '../src/models/project.model';

jest.mock('../src/models/project.model');
jest.mock('../src/utils/cloudinary.utils', () => ({
  uploader: {
    upload: jest.fn(),
    destroy: jest.fn(),
  },
}));

const ADMIN_ID = 'admin-uuid-1';
const OWNER_ID = 'owner-uuid-1';
const OTHER_MEMBER_ID = 'other-member-uuid-1';
const PROJECT_ID = 'project-uuid-1';

function mockRes(): Response {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

function mockProjectInstance(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: PROJECT_ID,
    userId: OWNER_ID,
    image: 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=600',
    title: 'Existing Project',
    description: 'Existing description',
    destroy: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('deleteProject authorization', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('allows an Admin to delete a project owned by someone else', async () => {
    const project = mockProjectInstance();
    (Project.findByPk as jest.Mock).mockResolvedValue(project);

    const req = {
      params: { id: PROJECT_ID },
      user: { id: ADMIN_ID, role: 'Admin' },
    } as unknown as Request;
    const res = mockRes();

    await deleteProject(req, res);

    expect(project.destroy).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('allows a Member to delete their own project', async () => {
    const project = mockProjectInstance({ userId: OWNER_ID });
    (Project.findByPk as jest.Mock).mockResolvedValue(project);

    const req = {
      params: { id: PROJECT_ID },
      user: { id: OWNER_ID, role: 'Member' },
    } as unknown as Request;
    const res = mockRes();

    await deleteProject(req, res);

    expect(project.destroy).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('forbids a Member from deleting another member\'s project', async () => {
    const project = mockProjectInstance({ userId: OWNER_ID });
    (Project.findByPk as jest.Mock).mockResolvedValue(project);

    const req = {
      params: { id: PROJECT_ID },
      user: { id: OTHER_MEMBER_ID, role: 'Member' },
    } as unknown as Request;
    const res = mockRes();

    await deleteProject(req, res);

    expect(project.destroy).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 404 when deleting a non-existent project', async () => {
    (Project.findByPk as jest.Mock).mockResolvedValue(null);

    const req = {
      params: { id: 'does-not-exist' },
      user: { id: OTHER_MEMBER_ID, role: 'Member' },
    } as unknown as Request;
    const res = mockRes();

    await deleteProject(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('updateProject authorization', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('allows an Admin to update a project owned by someone else', async () => {
    const project = mockProjectInstance();
    (Project.findByPk as jest.Mock).mockResolvedValue(project);

    const req = {
      params: { id: PROJECT_ID },
      body: { title: 'Updated title' },
      user: { id: ADMIN_ID, role: 'Admin', firstName: 'Ad', lastName: 'Min' },
    } as unknown as Request;
    const res = mockRes();

    await updateProject(req, res);

    expect(project.update).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('allows a Member to update their own project', async () => {
    const project = mockProjectInstance({ userId: OWNER_ID });
    (Project.findByPk as jest.Mock).mockResolvedValue(project);

    const req = {
      params: { id: PROJECT_ID },
      body: { title: 'Updated title' },
      user: { id: OWNER_ID, role: 'Member', firstName: 'Ow', lastName: 'Ner' },
    } as unknown as Request;
    const res = mockRes();

    await updateProject(req, res);

    expect(project.update).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('forbids a Member from updating another member\'s project', async () => {
    const project = mockProjectInstance({ userId: OWNER_ID });
    (Project.findByPk as jest.Mock).mockResolvedValue(project);

    const req = {
      params: { id: PROJECT_ID },
      body: { title: 'Hijacked title' },
      user: { id: OTHER_MEMBER_ID, role: 'Member', firstName: 'Other', lastName: 'Member' },
    } as unknown as Request;
    const res = mockRes();

    await updateProject(req, res);

    expect(project.update).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 404 when updating a non-existent project', async () => {
    (Project.findByPk as jest.Mock).mockResolvedValue(null);

    const req = {
      params: { id: 'does-not-exist' },
      body: { title: 'Updated title' },
      user: { id: OTHER_MEMBER_ID, role: 'Member' },
    } as unknown as Request;
    const res = mockRes();

    await updateProject(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});
