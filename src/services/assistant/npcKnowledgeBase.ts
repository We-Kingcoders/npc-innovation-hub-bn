/**
 * Static NPC Innovation Hub organizational facts.
 *
 * No backend-stored version of this content exists anywhere in this
 * repo (confirmed by a full search of src/models and src/config) - it
 * only ever lived as static copy in the frontend's public pages. Every
 * fact below was ported VERBATIM from that real source rather than
 * invented, to avoid the assistant hallucinating its own org identity:
 *   - identity/history -> npc-innovation-hub/src/pages/Hub-info/AboutIntro.tsx
 *   - mission/vision/goals -> npc-innovation-hub/src/pages/Hub-info/MissionSection.tsx
 *   - contact details -> npc-innovation-hub/src/pages/landing/ContactSection.tsx
 *   - founded-year math -> npc-innovation-hub/src/hooks/useHubStats.ts
 *
 * This is authoritative for the assistant. If the frontend copy changes,
 * update this file too - there is no single source of truth to pull from
 * automatically until/unless this content moves to a CMS-backed table.
 */

const HUB_FOUNDED_YEAR = 2024;

export function getYearsActive(): number {
  return Math.max(1, new Date().getFullYear() - HUB_FOUNDED_YEAR);
}

export const NPC_IDENTITY = `NPC Innovation Hub is the National Police College Innovation Hub, established in ${HUB_FOUNDED_YEAR}. It is a technology-driven learning and innovation platform located within the National Police College. It is more than a workspace - it is a catalyst for innovation, a platform for serving and strengthening the institution, and a home for the College's tech-minded students. It provides a dynamic ecosystem where developers, designers, and innovators collaborate, learn, and build solutions that serve the institution.`;

export const NPC_MISSION = `We empower student innovators through a collaborative ecosystem built on technology, mentorship, and hands-on skill development. Our work accelerates the National Police College's digital transformation and strengthens its institutional capacity.`;

export const NPC_VISION = `To establish the National Police College as a leading hub for technology excellence and sustainable innovation, empowering students to pioneer practical, technology-driven solutions to modern security and societal challenges.`;

export const NPC_GOALS = `We aim to deliver high-quality, secure software that serves the National Police College's needs, enhancing user satisfaction. Our focus is on innovation, efficiency, and fostering a culture of learning.`;

export const NPC_CONTACT = {
  location: 'Musanze, North, Rwanda',
  phone: '+250 783 330 443',
  email: 'npcinnovationhub2024@gmail.com',
};

/**
 * A single formatted block for the "about NPC" section of the assistant's
 * context - kept short and factual, not marketing copy, since this text
 * is what the model is told to treat as ground truth.
 */
export function getOrgFactsBlock(): string {
  return [
    `About NPC Innovation Hub: ${NPC_IDENTITY}`,
    `Mission: ${NPC_MISSION}`,
    `Vision: ${NPC_VISION}`,
    `Goals: ${NPC_GOALS}`,
    `Years active: ${getYearsActive()}`,
    `Contact: located in ${NPC_CONTACT.location}, phone ${NPC_CONTACT.phone}, email ${NPC_CONTACT.email}.`,
  ].join('\n');
}
