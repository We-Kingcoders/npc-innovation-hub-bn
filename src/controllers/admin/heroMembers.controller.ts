import { Request, Response } from 'express';
import HeroFeaturedMember from '../../models/heroFeaturedMember.model';
import Member from '../../models/member.model';

// Every response in this feature is deliberately projected to only these
// three display fields (plus whichever id is relevant) - never bio, skills,
// contacts, education, tagline, or anything else from the full profile.
function toHeroMemberSummary(heroRecord: HeroFeaturedMember) {
  const member = (heroRecord as unknown as { Member?: { name: string; imageUrl: string; role: string } }).Member;
  return {
    id: heroRecord.id,
    name: member?.name,
    imageUrl: member?.imageUrl,
    role: member?.role,
  };
}

// GET /api/admin/members/picker - powers the admin's member-picker dropdown.
// Returns every member; the caller is expected to cross-reference against
// GET /api/admin/hero-members to exclude already-featured ones if desired -
// no server-side exclusion query param, kept deliberately simple.
export const getMembersPicker = async (req: Request, res: Response): Promise<void> => {
  try {
    const members = await Member.findAll({
      attributes: ['id', 'name', 'imageUrl', 'role'],
      order: [['name', 'ASC']],
    });

    res.status(200).json({
      status: 'success',
      results: members.length,
      data: { members },
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
      include: [{ model: Member, attributes: ['name', 'imageUrl', 'role'] }],
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

// POST /api/admin/hero-members - body: { memberId }
export const addHeroMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const { memberId } = req.body;

    const member = await Member.findByPk(memberId);
    if (!member) {
      res.status(404).json({
        status: 'fail',
        message: 'Member not found',
      });
      return;
    }

    const existing = await HeroFeaturedMember.findOne({ where: { memberId } });
    if (existing) {
      res.status(409).json({
        status: 'fail',
        message: 'This member is already featured in the hero section',
      });
      return;
    }

    const maxOrder = (await HeroFeaturedMember.max('order')) as number | null;
    const nextOrder = typeof maxOrder === 'number' ? maxOrder + 1 : 0;

    const heroMember = await HeroFeaturedMember.create({ memberId, order: nextOrder });

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
      include: [{ model: Member, attributes: ['name', 'imageUrl', 'role'] }],
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
