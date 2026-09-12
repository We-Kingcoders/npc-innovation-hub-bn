import { Request, Response } from 'express';
import { Op, WhereOptions } from 'sequelize';
import HeroFeaturedMember from '../../models/heroFeaturedMember.model';
import Member from '../../models/member.model';
import User from '../../models/user.model';

// Every response in this feature is deliberately projected to only these
// display fields (plus whichever id is relevant) - never bio, skills,
// contacts, education, tagline, or anything else from the full profile.
// userId is included alongside memberId so the admin UI can tell which
// already-featured entries correspond to which picker candidates (the
// picker is keyed by User id now, not Member id - see getMembersPicker).
function toHeroMemberSummary(heroRecord: HeroFeaturedMember) {
  const member = (heroRecord as unknown as {
    Member?: { name: string; imageUrl: string; role: string; userId: string };
  }).Member;
  return {
    id: heroRecord.id,
    userId: member?.userId,
    name: member?.name,
    imageUrl: member?.imageUrl,
    role: member?.role,
  };
}

// GET /api/admin/members/picker?search= - powers the admin's member-picker
// dropdown. Every active user in the system is a candidate - Members and
// Admins alike, not just those who already have a Member profile. Most
// Admin accounts never get one: only accepting a membership application
// creates a Member row automatically (see acceptApplication), and an
// Admin account is never the product of that flow. A user without a
// Member profile yet still shows up here, with their account name/role
// as a fallback - same pattern as the public /members listing
// (member.controller.ts's getAllMembers). Adding one of these candidates
// to the hero section (addHeroMember below) is what actually creates
// their Member row, if they don't already have one.
export const getMembersPicker = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search } = req.query;
    const term = typeof search === 'string' ? search.trim() : '';

    const where: WhereOptions = term
      ? {
          isActive: true,
          [Op.or]: [
            { firstName: { [Op.iLike]: `%${term}%` } },
            { lastName: { [Op.iLike]: `%${term}%` } },
            { email: { [Op.iLike]: `%${term}%` } },
          ],
        }
      : { isActive: true };

    const users = await User.findAll({
      where,
      attributes: ['id', 'firstName', 'lastName', 'role'],
      order: [['firstName', 'ASC']],
    });

    // One query for every Member row this batch of users could have,
    // instead of one lookup per user - same reasoning as getAllMembers.
    const memberRows = await Member.findAll({
      where: { userId: users.map((user) => user.id) },
      attributes: ['userId', 'name', 'role', 'imageUrl'],
    });
    const memberByUserId = new Map(memberRows.map((member) => [member.userId, member]));

    const candidates = users.map((user) => {
      const member = memberByUserId.get(user.id);
      return {
        id: user.id,
        name: member?.name ?? `${user.firstName} ${user.lastName}`,
        role: member?.role ?? user.role,
        imageUrl: member?.imageUrl ?? null,
      };
    });

    res.status(200).json({
      status: 'success',
      results: candidates.length,
      data: { members: candidates },
    });
  } catch (error) {
    console.error('Error fetching members picker list:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch members',
    });
  }
};

// GET /api/admin/hero-members
export const getHeroMembers = async (req: Request, res: Response): Promise<void> => {
  try {
    const heroMembers = await HeroFeaturedMember.findAll({
      order: [['order', 'ASC']],
      include: [{ model: Member, attributes: ['name', 'imageUrl', 'role', 'userId'] }],
    });

    res.status(200).json({
      status: 'success',
      results: heroMembers.length,
      data: { heroMembers: heroMembers.map(toHeroMemberSummary) },
    });
  } catch (error) {
    console.error('Error fetching hero members:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch hero members',
    });
  }
};

// POST /api/admin/hero-members - body: { userId }. Keyed by User id, not
// Member id, since the picker now offers every user (see
// getMembersPicker) - most of whom don't have a Member profile yet.
export const addHeroMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      res.status(404).json({
        status: 'fail',
        message: 'User not found',
      });
      return;
    }

    // Being featured on the hero section is itself a reason to have a
    // Member profile, so create a minimal one here rather than requiring
    // the admin to separately set one up first through Member management
    // - same fallback shape acceptApplication uses when it creates one.
    let member = await Member.findOne({ where: { userId: user.id } });
    if (!member) {
      member = await Member.create({
        userId: user.id,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role === 'Admin' ? 'Admin' : 'Other',
        imageUrl: user.image ?? '/members-images/member-demo.jpg',
        skills: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    const existing = await HeroFeaturedMember.findOne({ where: { memberId: member.id } });
    if (existing) {
      res.status(409).json({
        status: 'fail',
        message: 'This member is already featured in the hero section',
      });
      return;
    }

    const maxOrder = (await HeroFeaturedMember.max('order'));
    const nextOrder = typeof maxOrder === 'number' ? maxOrder + 1 : 0;

    const heroMember = await HeroFeaturedMember.create({ memberId: member.id, order: nextOrder });

    res.status(201).json({
      status: 'success',
      message: 'Member added to the hero section',
      data: {
        id: heroMember.id,
        name: member.name,
        imageUrl: member.imageUrl,
        role: member.role,
      },
    });
  } catch (error) {
    console.error('Error adding hero member:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to add hero member',
    });
  }
};

// DELETE /api/admin/hero-members/:id - deletes the HeroFeaturedMember row
// only, never the underlying Member.
export const deleteHeroMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const heroMember = await HeroFeaturedMember.findByPk(id);
    if (!heroMember) {
      res.status(404).json({
        status: 'fail',
        message: 'Hero member not found',
      });
      return;
    }

    await heroMember.destroy();

    res.status(200).json({
      status: 'success',
      message: 'Member removed from the hero section',
    });
  } catch (error) {
    console.error('Error deleting hero member:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete hero member',
    });
  }
};

// PATCH /api/admin/hero-members/reorder - body: ordered array of
// HeroFeaturedMember ids. Rejects unless the array is exactly the current
// featured set (no missing/extra/duplicate ids).
export const reorderHeroMembers = async (req: Request, res: Response): Promise<void> => {
  try {
    const order: string[] = req.body;

    const current = await HeroFeaturedMember.findAll({ attributes: ['id'] });
    const currentIds = current.map((heroMember) => heroMember.id);
    const providedSet = new Set(order);

    const sameSize = currentIds.length === order.length;
    const noDuplicates = providedSet.size === order.length;
    const exactSameSet = sameSize && currentIds.every((id) => providedSet.has(id));

    if (!sameSize || !noDuplicates || !exactSameSet) {
      res.status(400).json({
        status: 'fail',
        message:
          'order must contain exactly the current set of featured member ids, with no missing, extra, or duplicate ids',
      });
      return;
    }

    await Promise.all(order.map((id, index) => HeroFeaturedMember.update({ order: index }, { where: { id } })));

    const updated = await HeroFeaturedMember.findAll({
      order: [['order', 'ASC']],
      include: [{ model: Member, attributes: ['name', 'imageUrl', 'role', 'userId'] }],
    });

    res.status(200).json({
      status: 'success',
      message: 'Hero member order updated',
      data: { heroMembers: updated.map(toHeroMemberSummary) },
    });
  } catch (error) {
    console.error('Error reordering hero members:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to reorder hero members',
    });
  }
};
