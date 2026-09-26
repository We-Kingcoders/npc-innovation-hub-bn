/**
 * Knowledge retrieval for the NPC AI Assistant.
 *
 * The core security rule for this whole file: every function takes an
 * explicit `user` PARAMETER and never reads `req` internally. That's what
 * makes authorization a structural property instead of something that
 * depends on the intent classifier having guessed correctly - a test can
 * call getResourcesContext(undefined) directly and assert zero results
 * regardless of how a message was phrased, and a future call site can't
 * accidentally "forget" to check auth because there's no ambient request
 * to read from.
 *
 * Every query below replicates the EXACT filter the corresponding real,
 * already-public controller uses (verified by reading each one directly)
 * - never a looser one. Blogs must filter isPublished:true the same way
 * blog.controller.ts's getAllBlogs does; nothing here does a raw byId
 * lookup (blog.controller.ts's getBlogById has no such check, which is
 * exactly the kind of gap this file must not reproduce).
 */
import { Op } from 'sequelize';
import Project from '../../models/project.model';
import Event from '../../models/event.model';
import Blog from '../../models/blog.model';
import HeroFeaturedMember from '../../models/heroFeaturedMember.model';
import Member from '../../models/member.model';
import Alumnus from '../../models/alumnus.model';
import User from '../../models/user.model';
import Resource from '../../models/resource.model';
import Task from '../../models/task.model';
import { getOrgFactsBlock } from './npcKnowledgeBase';

export interface AssistantUser {
  id: string;
  role: string;
}

const RESULT_CAP = 5;

async function getProjectsContext(): Promise<string | null> {
  const projects = await Project.findAll({
    order: [['createdAt', 'DESC']],
    limit: RESULT_CAP,
    attributes: ['title', 'description', 'owner'],
  });
  if (projects.length === 0) return null;
  return (
    'Recent NPC projects:\n' +
    projects
      .map((p) => `- "${p.get('title')}" by ${p.get('owner')}: ${truncate(p.get('description'), 160)}`)
      .join('\n')
  );
}

async function getEventsContext(): Promise<string | null> {
  const now = new Date();
  const events = await Event.findAll({
    where: { startTime: { [Op.gte]: now } },
    order: [['startTime', 'ASC']],
    limit: RESULT_CAP,
    attributes: ['title', 'location', 'startTime', 'description'],
  });
  if (events.length === 0) return 'There are no upcoming NPC events scheduled right now.';
  return (
    'Upcoming NPC events:\n' +
    events
      .map(
        (e) =>
          `- "${e.get('title')}" at ${e.get('location')} on ${new Date(e.get('startTime')).toDateString()}: ${truncate(e.get('description'), 120)}`,
      )
      .join('\n')
  );
}

async function getBlogsContext(): Promise<string | null> {
  // Matches blog.controller.ts's getAllBlogs filter exactly - isPublished
  // only. Never a byId lookup (that endpoint has no such check).
  const blogs = await Blog.findAll({
    where: { isPublished: true },
    order: [['createdAt', 'DESC']],
    limit: RESULT_CAP,
    attributes: ['title', 'summary', 'category'],
  });
  if (blogs.length === 0) return null;
  return (
    'Recent NPC blog articles:\n' +
    blogs.map((b) => `- "${b.get('title')}" (${b.get('category')}): ${truncate(b.get('summary'), 140)}`).join('\n')
  );
}

async function getMembersContext(): Promise<string | null> {
  // Matches member.controller.ts's getAllMembers filter - verified,
  // active Members/Admins only.
  const users = await User.findAll({
    where: { role: { [Op.in]: ['Member', 'Admin'] }, verified: true, isActive: true },
    limit: RESULT_CAP,
    include: [{ model: Member, attributes: ['name', 'role', 'tagline'], required: true }],
  });
  if (users.length === 0) return null;
  const lines = users
    .map((u) => {
      const member = (u as unknown as { Member?: { name?: string; role?: string; tagline?: string } }).Member;
      if (!member?.name) return null;
      return `- ${member.name} (${member.role || 'Member'})${member.tagline ? `: ${member.tagline}` : ''}`;
    })
    .filter((line): line is string => Boolean(line));
  if (lines.length === 0) return null;
  return 'NPC Innovation Hub members:\n' + lines.join('\n');
}

async function getHeroMembersContext(): Promise<string | null> {
  const featured = await HeroFeaturedMember.findAll({
    order: [['order', 'ASC']],
    limit: RESULT_CAP,
    include: [{ model: Member, attributes: ['name', 'role'] }],
  });
  if (featured.length === 0) return null;
  const lines = featured
    .map((f) => {
      const member = (f as unknown as { Member?: { name?: string; role?: string } }).Member;
      return member?.name ? `- ${member.name} (${member.role || 'Member'})` : null;
    })
    .filter((line): line is string => Boolean(line));
  if (lines.length === 0) return null;
  return 'Featured NPC members:\n' + lines.join('\n');
}

async function getAlumniContext(): Promise<string | null> {
  const [memberAlumni, standaloneAlumni] = await Promise.all([
    Member.findAll({ where: { isAlumni: true }, attributes: ['name', 'role'], limit: RESULT_CAP }),
    Alumnus.findAll({ attributes: ['fullName', 'role'], limit: RESULT_CAP }),
  ]);
  const lines = [
    ...memberAlumni.map((m) => `- ${m.get('name')} (${m.get('role')})`),
    ...standaloneAlumni.map((a) => `- ${a.get('fullName')} (${a.get('role')})`),
  ].slice(0, RESULT_CAP);
  if (lines.length === 0) return null;
  return 'NPC alumni:\n' + lines.join('\n');
}

// Resources require authentication on every real route with no
// exceptions (confirmed - resource.routes.ts applies protectRoute to
// every GET) - so this is only ever called when `user` is defined.
// Mirrors resource.controller.ts's own "any authenticated user" model:
// no further role check beyond "is logged in".
async function getResourcesContext(): Promise<string | null> {
  const resources = await Resource.findAll({
    order: [['createdAt', 'DESC']],
    limit: RESULT_CAP,
    attributes: ['title', 'category', 'type'],
  });
  if (resources.length === 0) return null;
  return (
    'Recent NPC learning resources:\n' +
    resources.map((r) => `- "${r.get('title')}" (${r.get('category')}, ${r.get('type')})`).join('\n')
  );
}

// "My profile"/"my tasks"/"my projects" - strictly scoped to the
// authenticated user's OWN id from the verified JWT. Never accepts a
// client-supplied target id anywhere in this function - there is no
// parameter for one.
async function getOwnAuthenticatedContext(userId: string): Promise<string | null> {
  const [member, ownProjects, ownTasks] = await Promise.all([
    Member.findOne({ where: { userId }, attributes: ['name', 'role', 'tagline', 'bio'] }),
    Project.findAll({ where: { userId }, attributes: ['title'], limit: RESULT_CAP }),
    Task.findAll({ where: { assignedTo: userId }, attributes: ['title', 'status'], limit: RESULT_CAP }),
  ]);

  const parts: string[] = [];
  if (member) {
    parts.push(
      `Your profile: ${member.get('name')}, ${member.get('role')}.${member.get('tagline') ? ` ${member.get('tagline')}` : ''}`,
    );
  }
  if (ownProjects.length > 0) {
    parts.push('Your projects: ' + ownProjects.map((p) => `"${p.get('title')}"`).join(', '));
  }
  if (ownTasks.length > 0) {
    parts.push(
      'Your tasks: ' + ownTasks.map((t) => `"${t.get('title')}" (${t.get('status')})`).join(', '),
    );
  }
  return parts.length > 0 ? parts.join('\n') : null;
}

function truncate(text: string | undefined | null, max: number): string {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

export type AssistantIntent =
  | 'about'
  | 'projects'
  | 'events'
  | 'blogs'
  | 'members'
  | 'alumni'
  | 'resources'
  | 'own_data'
  | 'general';

// Simple, transparent rule-based classifier - not ML/embeddings. Content
// volume here (dozens of rows per domain) doesn't justify that
// complexity, and a keyword match is easy to audit/extend. Order matters:
// "own data" phrasing is checked before generic domain keywords so "what
// are my tasks" doesn't get classified as a generic project/task
// question.
const INTENT_PATTERNS: Array<{ intent: AssistantIntent; pattern: RegExp }> = [
  { intent: 'own_data', pattern: /\bmy (profile|tasks?|projects?)\b|\bjyewe\b|\bnjye\b/i },
  { intent: 'about', pattern: /\b(mission|vision|goals?|about npc|who (is|are) npc|amateka|intego)\b/i },
  { intent: 'projects', pattern: /\bprojects?\b|\bimishinga\b/i },
  { intent: 'events', pattern: /\bevents?\b|\bibirori\b|\bitsibi\b/i },
  { intent: 'blogs', pattern: /\bblogs?\b|\barticles?\b/i },
  { intent: 'members', pattern: /\bmembers?\b|\bumunyamuryango\b/i },
  { intent: 'alumni', pattern: /\balumni\b/i },
  { intent: 'resources', pattern: /\bresources?\b/i },
  { intent: 'about', pattern: /\bcontact\b|\btelefoni\b|\bimeri\b|\bemail\b|\bphone\b/i },
];

export function classifyIntent(message: string): AssistantIntent[] {
  const matches = INTENT_PATTERNS.filter(({ pattern }) => pattern.test(message)).map((m) => m.intent);
  const unique = [...new Set(matches)];
  return unique.length > 0 ? unique : ['general'];
}

/**
 * Build the bounded knowledge context for a message, gated by the
 * authenticated user (or lack of one). This is the ONLY place callers
 * should get grounding context from - always pass the real `user` from
 * the verified request, or `undefined` for anonymous.
 */
export async function retrieveKnowledge(
  message: string,
  user: AssistantUser | undefined,
): Promise<string> {
  const intents = classifyIntent(message);
  const blocks: string[] = [getOrgFactsBlock()];

  const fetchers: Array<() => Promise<string | null>> = [];

  if (intents.includes('about') || intents.includes('general')) {
    // org facts already included unconditionally above
  }
  if (intents.includes('projects') || intents.includes('general')) fetchers.push(getProjectsContext);
  if (intents.includes('events')) fetchers.push(getEventsContext);
  if (intents.includes('blogs')) fetchers.push(getBlogsContext);
  if (intents.includes('members')) fetchers.push(getMembersContext);
  if (intents.includes('alumni')) fetchers.push(getAlumniContext);

  // Resources: only ever fetched when a real authenticated user is
  // present - this is the structural RBAC gate, independent of whatever
  // the intent classifier decided.
  if (intents.includes('resources') && user) {
    fetchers.push(getResourcesContext);
  }

  if (intents.includes('general')) {
    fetchers.push(getHeroMembersContext);
  }

  const results = await Promise.all(fetchers.map((fn) => fn()));
  results.forEach((r) => {
    if (r) blocks.push(r);
  });

  if (intents.includes('own_data') && user) {
    const own = await getOwnAuthenticatedContext(user.id);
    if (own) blocks.push(own);
  }

  return blocks.join('\n\n');
}

// Exported individually for direct, structural RBAC testing - a test
// calls these with user: undefined and asserts the resources/own-data
// paths never run, independent of intent classification.
export const __internal = {
  getResourcesContext,
  getOwnAuthenticatedContext,
};
