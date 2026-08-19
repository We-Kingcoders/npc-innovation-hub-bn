import { Request, Response } from 'express';
import HeroFeaturedMember from '../models/heroFeaturedMember.model';
import Member from '../models/member.model';

// Public projection: only name/imageUrl/role. No internal HeroFeaturedMember
// id, no Member id, no memberId - the hero slider doesn't need them, and
// nothing beyond these 3 fields should ever leak here.
function toPublicHeroMember(heroRecord: HeroFeaturedMember) {
  const member = (heroRecord as unknown as { Member?: { name: string; imageUrl: string; role: string } }).Member;
  return {
    name: member?.name,
    imageUrl: member?.imageUrl,
    role: member?.role,
  };
}

// GET /api/hero-members - public, no auth required
export const getPublicHeroMembers = async (req: Request, res: Response): Promise<void> => {
  try {
    const heroMembers = await HeroFeaturedMember.findAll({
      order: [['order', 'ASC']],
      include: [{ model: Member, attributes: ['name', 'imageUrl', 'role'] }],
    });

    res.status(200).json({
      status: 'success',
      results: heroMembers.length,
      data: { heroMembers: heroMembers.map(toPublicHeroMember) },
    });
  } catch (error) {
    console.error('Error fetching public hero members:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching hero members',
    });
  }
};
