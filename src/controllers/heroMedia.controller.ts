import { Request, Response } from 'express';
import HeroMedia from '../models/heroMedia.model';

// Public projection: only what the homepage carousel actually renders.
// Never cloudinaryPublicId or uploadedBy. title/caption/displayOrder are
// also dropped - array position already encodes order, and nothing in
// the homepage renders a per-media title/caption over the hero (the
// headline stays independent of whichever media is showing).
function toPublicHeroMedia(media: HeroMedia) {
  return {
    id: media.id,
    type: media.type,
    url: media.url,
    thumbnailUrl: media.thumbnailUrl,
    altText: media.altText,
  };
}

// GET /api/hero-media - public, no auth required. Active media only,
// ordered for the carousel. An empty result is a normal state (falls
// back to the static hero image client-side), not an error.
//
// isDefault is deliberately NOT part of the public projection below (it's
// an internal management concept, not something the carousel displays) -
// but the frontend still needs to know which item to show first/use for
// prefers-reduced-motion visitors. Rather than exposing the field, the
// default item (if any) is simply sorted first here, so array position
// alone carries that information, the same way displayOrder's own
// position already stands in for an explicit order field.
export const getPublicHeroMedia = async (req: Request, res: Response): Promise<void> => {
  try {
    const media = await HeroMedia.findAll({
      where: { isActive: true },
      order: [['isDefault', 'DESC'], ['displayOrder', 'ASC']],
    });

    res.status(200).json({
      status: 'success',
      results: media.length,
      data: { media: media.map(toPublicHeroMedia) },
    });
  } catch (error) {
    console.error('Error fetching public hero media:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching hero media',
    });
  }
};
