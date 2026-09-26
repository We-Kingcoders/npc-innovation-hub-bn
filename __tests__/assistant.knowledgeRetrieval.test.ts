// Real-DB coverage for the assistant's knowledge retrieval / RBAC gating.
// Deliberately NOT model-mocked (unlike most other __tests__ files) - this
// module exercises Project/Event/Blog/Member/HeroFeaturedMember/Alumnus/
// Resource/Task/User together through real Sequelize associations
// (User.hasOne(Member), HeroFeaturedMember.belongsTo(Member), etc.), and
// mocking one association target while leaving another real is exactly
// the kind of setup that breaks at model-import time. Running against the
// real disposable test Postgres (see globalSetup.ts) avoids that entirely
// and is the more faithful test of what real queries actually return.
import { randomUUID } from 'crypto';
import User from '../src/models/user.model';
import Member from '../src/models/member.model';
import Project from '../src/models/project.model';
import Event from '../src/models/event.model';
import Blog from '../src/models/blog.model';
import HeroFeaturedMember from '../src/models/heroFeaturedMember.model';
import Alumnus from '../src/models/alumnus.model';
import Resource, { ResourceCategory, ResourceType, ResourceDifficulty } from '../src/models/resource.model';
import Task from '../src/models/task.model';
import { retrieveKnowledge, classifyIntent } from '../src/services/assistant/knowledgeRetrieval.service';

describe('classifyIntent', () => {
  it('classifies "my tasks"/"my profile" phrasing as own_data, not a generic domain', () => {
    expect(classifyIntent('What are my tasks?')).toEqual(['own_data']);
    expect(classifyIntent('Show my profile please')).toEqual(['own_data']);
  });

  it('classifies domain keywords', () => {
    expect(classifyIntent('Tell me about your projects')).toContain('projects');
    expect(classifyIntent('What events are coming up?')).toContain('events');
    expect(classifyIntent('Do you have any blog articles?')).toContain('blogs');
  });

  it('falls back to general for unrecognized phrasing', () => {
    expect(classifyIntent('Hello there!')).toEqual(['general']);
  });
});

describe('retrieveKnowledge - real DB, RBAC-gated', () => {
  let userA: { id: string };
  let userB: { id: string };
  let unpublishedBlogId: string;

  beforeAll(async () => {
    const createdUserA = await User.create({
      firstName: 'Alice',
      lastName: 'Assistant',
      email: `alice.${randomUUID()}@example.com`,
      password: 'hashed-not-relevant-here',
      role: 'Member',
      verified: true,
      isActive: true,
    } as any);
    const createdUserB = await User.create({
      firstName: 'Bob',
      lastName: 'Assistant',
      email: `bob.${randomUUID()}@example.com`,
      password: 'hashed-not-relevant-here',
      role: 'Member',
      verified: true,
      isActive: true,
    } as any);
    userA = { id: createdUserA.get('id') as string };
    userB = { id: createdUserB.get('id') as string };

    const memberA = await Member.create({
      userId: userA.id,
      name: 'Alice Assistant',
      role: 'Backend Developer',
      tagline: 'Ships things',
      skills: [],
    } as any);
    await Member.create({
      userId: userB.id,
      name: 'Bob Assistant',
      role: 'Frontend Developer',
      skills: [],
    } as any);

    await HeroFeaturedMember.create({ memberId: memberA.get('id') as string, order: 1 } as any);

    await Project.create({
      userId: userA.id,
      title: "Alice's Only Project",
      description: 'A project that belongs only to Alice.',
      owner: 'Alice Assistant',
    } as any);
    await Project.create({
      userId: userB.id,
      title: "Bob's Only Project",
      description: 'A project that belongs only to Bob.',
      owner: 'Bob Assistant',
    } as any);

    await Task.create({
      title: "Alice's secret task",
      description: 'Only Alice should ever see this in her own-data context.',
      dueDate: new Date(Date.now() + 86400000),
      createdBy: userA.id,
      assignedTo: userA.id,
    } as any);
    await Task.create({
      title: "Bob's secret task",
      description: 'Only Bob should ever see this in his own-data context.',
      dueDate: new Date(Date.now() + 86400000),
      createdBy: userB.id,
      assignedTo: userB.id,
    } as any);

    const futureStart = new Date(Date.now() + 7 * 86400000);
    const futureEnd = new Date(futureStart.getTime() + 3600000);
    await Event.create({
      title: 'NPC Hackathon',
      location: 'Musanze',
      description: 'A hackathon for NPC members.',
      startTime: futureStart,
      endTime: futureEnd,
      createdBy: userA.id,
    } as any);

    await Blog.create({
      title: 'Published Article',
      content: 'Full content here.',
      summary: 'A published article summary.',
      category: 'Back-end',
      authorId: userA.id,
      isPublished: true,
    } as any);
    const unpublished = await Blog.create({
      title: 'Draft Article - Should Never Appear',
      content: 'Draft content.',
      summary: 'This draft must never be visible to the assistant.',
      category: 'Back-end',
      authorId: userA.id,
      isPublished: false,
    } as any);
    unpublishedBlogId = unpublished.get('id') as string;

    await Alumnus.create({
      fullName: 'Grace Graduate',
      role: 'Alumna',
      createdBy: userA.id,
    } as any);

    await Resource.create({
      userId: userA.id,
      title: 'Internal Backend Guide',
      description: 'A resource that requires authentication to see, per resource.routes.ts.',
      category: ResourceCategory.BACKEND,
      type: ResourceType.DOCUMENTATION,
      difficulty: ResourceDifficulty.BEGINNER,
      author: 'Alice Assistant',
      isPaid: false,
    } as any);
  });

  afterAll(async () => {
    // Children before parents to respect FK constraints.
    await Task.destroy({ where: { createdBy: [userA.id, userB.id] } });
    await Resource.destroy({ where: { userId: [userA.id, userB.id] } });
    await Blog.destroy({ where: { authorId: [userA.id, userB.id] } });
    await Event.destroy({ where: { createdBy: userA.id } });
    await Alumnus.destroy({ where: { createdBy: userA.id } });
    await Project.destroy({ where: { userId: [userA.id, userB.id] } });
    await HeroFeaturedMember.destroy({ where: {} });
    await Member.destroy({ where: { userId: [userA.id, userB.id] } });
    await User.destroy({ where: { id: [userA.id, userB.id] } });
  });

  it('includes org facts and public project context for a general anonymous question', async () => {
    const context = await retrieveKnowledge('Hello, what can you tell me?', undefined);
    expect(context).toContain('NPC Innovation Hub');
    expect(context).toContain("Alice's Only Project");
  });

  it('never includes resource content for an anonymous caller, even when resources exist', async () => {
    const context = await retrieveKnowledge('What learning resources do you have?', undefined);
    expect(context).not.toContain('Internal Backend Guide');
  });

  it('includes resource content once a real authenticated user is present', async () => {
    const context = await retrieveKnowledge('What learning resources do you have?', {
      id: userA.id,
      role: 'Member',
    });
    expect(context).toContain('Internal Backend Guide');
  });

  it('never includes own-data context for an anonymous caller asking about "my tasks"', async () => {
    const context = await retrieveKnowledge('What are my tasks?', undefined);
    expect(context).not.toContain('secret task');
  });

  it("scopes own-data context strictly to the authenticated user's own id - never sees another user's data", async () => {
    const aliceContext = await retrieveKnowledge('What are my tasks and projects?', {
      id: userA.id,
      role: 'Member',
    });
    expect(aliceContext).toContain("Alice's secret task");
    expect(aliceContext).not.toContain("Bob's secret task");

    const bobContext = await retrieveKnowledge('What are my tasks and projects?', {
      id: userB.id,
      role: 'Member',
    });
    expect(bobContext).toContain("Bob's secret task");
    expect(bobContext).not.toContain("Alice's secret task");
  });

  it('never surfaces an unpublished blog, matching the public blog controller\'s own filter', async () => {
    const context = await retrieveKnowledge('Do you have any blog articles?', undefined);
    expect(context).toContain('Published Article');
    expect(context).not.toContain('Draft Article - Should Never Appear');
    expect(unpublishedBlogId).toBeTruthy();
  });

  it('includes upcoming events when asked', async () => {
    const context = await retrieveKnowledge('What events are coming up?', undefined);
    expect(context).toContain('NPC Hackathon');
  });
});
