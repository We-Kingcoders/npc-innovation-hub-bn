import { Request, Response } from 'express';
import fs from 'fs';
import sequelize from '../../config/database';
import HeroMedia from '../../models/heroMedia.model';
import cloudinary from '../../utils/cloudinary.utils';

const IMAGE_FOLDER = 'innovation-hub/hero-media/images';
const VIDEO_FOLDER = 'innovation-hub/hero-media/videos';

const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_MIMES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

// Every existing upload route in this codebase (resource.routes.ts,
// hubVideo.routes.ts) only ever checks the client-declared
// multipart Content-Type (file.mimetype) - trivially spoofable, since
// nothing stops a request from lying about it. This sniffs the actual
// file content's magic bytes via a real decoder instead, and the TYPE
// saved to the database comes from THIS result, never from the client's
// declared mimetype or the original filename/extension. file-type is
// ESM-only (v17+) in an otherwise CommonJS project, hence the dynamic
// import rather than a top-level one - Node's require() can't load an
// ESM package, but async import() always can, even from CJS.
async function sniffUploadedFile(filePath: string): Promise<{ type: 'IMAGE' | 'VIDEO'; mime: string } | null> {
  const { fileTypeFromFile } = await import('file-type');
  const detected = await fileTypeFromFile(filePath);
  if (!detected) return null;
  if (ALLOWED_IMAGE_MIMES.includes(detected.mime)) return { type: 'IMAGE', mime: detected.mime };
  if (ALLOWED_VIDEO_MIMES.includes(detected.mime)) return { type: 'VIDEO', mime: detected.mime };
  return null;
}

// GET /api/admin/hero-media - full rows, including cloudinaryPublicId
// (deliberately exposed to Admin, matching getHubVideoAdmin's own
// precedent - internal fields are a public-boundary concern, not an
// admin one; Admin needs it for Cloudinary-dashboard cross-reference).
export const getHeroMediaAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const media = await HeroMedia.findAll({ order: [['displayOrder', 'ASC']] });
    res.status(200).json({
      status: 'success',
      results: media.length,
      data: { media },
    });
  } catch (error) {
    console.error('Error fetching hero media (admin):', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch hero media',
    });
  }
};

// POST /api/admin/hero-media - single 'file' field, image or video. Type
// is decided by content sniffing (see sniffUploadedFile), never trusted
// from the client. New rows always append to the end of the current
// order and start active/non-default - an admin reorders/sets default
// afterward if needed.
export const uploadHeroMedia = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = req.user as { id: string; role: string };
    const uploadedFile = req.file;

    if (!uploadedFile) {
      res.status(400).json({
        status: 'fail',
        message: 'A file is required',
      });
      return;
    }

    const verified = await sniffUploadedFile(uploadedFile.path);
    if (!verified) {
      fs.unlinkSync(uploadedFile.path);
      res.status(400).json({
        status: 'fail',
        message: 'Unsupported or unrecognized file content. Allowed: JPEG, PNG, WEBP images or MP4, WEBM, MOV videos.',
      });
      return;
    }

    if (verified.type === 'IMAGE' && uploadedFile.size > MAX_IMAGE_SIZE_BYTES) {
      fs.unlinkSync(uploadedFile.path);
      res.status(400).json({
        status: 'fail',
        message: 'Images must be under 10MB',
      });
      return;
    }

    const { title, altText, caption } = req.body as { title: string | null; altText: string | null; caption: string | null };
    const isImage = verified.type === 'IMAGE';

    const uploadResult = await cloudinary.uploader.upload(uploadedFile.path, {
      folder: isImage ? IMAGE_FOLDER : VIDEO_FOLDER,
      resource_type: isImage ? 'image' : 'video',
    });
    fs.unlinkSync(uploadedFile.path);

    // Cloudinary serves a JPG poster frame for any uploaded video at the
    // same public_id with the extension swapped - no separate upload or
    // eager transform needed.
    const thumbnailUrl = isImage ? null : uploadResult.secure_url.replace(/\.[^./]+$/, '.jpg');

    const maxOrder = await HeroMedia.max('displayOrder');
    const nextOrder = typeof maxOrder === 'number' ? maxOrder + 1 : 0;

    const media = await HeroMedia.create({
      type: verified.type,
      url: uploadResult.secure_url,
      cloudinaryPublicId: uploadResult.public_id,
      thumbnailUrl,
      title: title || null,
      altText: altText || null,
      caption: caption || null,
      isActive: true,
      isDefault: false,
      displayOrder: nextOrder,
      uploadedBy: currentUser.id,
    });

    res.status(201).json({
      status: 'success',
      message: 'Hero media uploaded',
      data: { media },
    });
  } catch (error) {
    console.error('Error uploading hero media:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to upload hero media',
    });
  }
};

// PATCH /api/admin/hero-media/:id - metadata only (title/altText/caption).
// Replacing the underlying file is out of scope for v1 - delete + re-upload.
export const updateHeroMediaMetadata = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, altText, caption } = req.body as { title?: string | null; altText?: string | null; caption?: string | null };

    const media = await HeroMedia.findByPk(id);
    if (!media) {
      res.status(404).json({
        status: 'fail',
        message: 'Hero media not found',
      });
      return;
    }

    const updates: Partial<{ title: string | null; altText: string | null; caption: string | null }> = {};
    if (title !== undefined) updates.title = title || null;
    if (altText !== undefined) updates.altText = altText || null;
    if (caption !== undefined) updates.caption = caption || null;

    await media.update(updates);

    res.status(200).json({
      status: 'success',
      message: 'Hero media updated',
      data: { media },
    });
  } catch (error) {
    console.error('Error updating hero media metadata:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update hero media',
    });
  }
};

function setActiveState(isActive: boolean) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const media = await HeroMedia.findByPk(id);
      if (!media) {
        res.status(404).json({
          status: 'fail',
          message: 'Hero media not found',
        });
        return;
      }

      await media.update({ isActive });

      res.status(200).json({
        status: 'success',
        message: isActive ? 'Hero media activated' : 'Hero media deactivated',
        data: { media },
      });
    } catch (error) {
      console.error('Error updating hero media active state:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to update hero media',
      });
    }
  };
}

// PATCH /api/admin/hero-media/:id/activate
export const activateHeroMedia = setActiveState(true);
// PATCH /api/admin/hero-media/:id/deactivate
export const deactivateHeroMedia = setActiveState(false);

// PATCH /api/admin/hero-media/:id/default - unsets any existing default and
// sets this one, in a single transaction so there's never a window with
// zero or two default rows.
export const setDefaultHeroMedia = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const media = await sequelize.transaction(async (t) => {
      const target = await HeroMedia.findByPk(id, { transaction: t });
      if (!target) return null;

      await HeroMedia.update({ isDefault: false }, { where: { isDefault: true }, transaction: t });
      await target.update({ isDefault: true }, { transaction: t });
      return target;
    });

    if (!media) {
      res.status(404).json({
        status: 'fail',
        message: 'Hero media not found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      message: 'Default hero media updated',
      data: { media },
    });
  } catch (error) {
    console.error('Error setting default hero media:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to set default hero media',
    });
  }
};

// PATCH /api/admin/hero-media/reorder - body: ordered array of HeroMedia
// ids. Rejects unless the array is exactly the current set (no missing,
// extra, or duplicate ids) - same discipline as reorderHeroMembers.
export const reorderHeroMedia = async (req: Request, res: Response): Promise<void> => {
  try {
    const order: string[] = req.body;

    const current = await HeroMedia.findAll({ attributes: ['id'] });
    const currentIds = current.map((m) => m.id);
    const providedSet = new Set(order);

    const sameSize = currentIds.length === order.length;
    const noDuplicates = providedSet.size === order.length;
    const exactSameSet = sameSize && currentIds.every((id) => providedSet.has(id));

    if (!sameSize || !noDuplicates || !exactSameSet) {
      res.status(400).json({
        status: 'fail',
        message: 'order must contain exactly the current set of hero media ids, with no missing, extra, or duplicate ids',
      });
      return;
    }

    await sequelize.transaction(async (t) => {
      await Promise.all(
        order.map((id, index) => HeroMedia.update({ displayOrder: index }, { where: { id }, transaction: t })),
      );
    });

    const updated = await HeroMedia.findAll({ order: [['displayOrder', 'ASC']] });

    res.status(200).json({
      status: 'success',
      message: 'Hero media order updated',
      data: { media: updated },
    });
  } catch (error) {
    console.error('Error reordering hero media:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to reorder hero media',
    });
  }
};

// DELETE /api/admin/hero-media/:id - Cloudinary cleanup is best-effort;
// the row is deleted regardless of whether it succeeds, matching
// deleteHubVideo's resilience. If the deleted row was the default,
// nothing is auto-promoted - the public homepage's own fallback (first
// item in displayOrder, or the static asset if none remain) covers it.
export const deleteHeroMedia = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const media = await HeroMedia.findByPk(id);
    if (!media) {
      res.status(404).json({
        status: 'fail',
        message: 'Hero media not found',
      });
      return;
    }

    try {
      await cloudinary.uploader.destroy(media.cloudinaryPublicId, {
        resource_type: media.type === 'IMAGE' ? 'image' : 'video',
      });
    } catch (cleanupError) {
      console.warn('Failed to delete hero media from Cloudinary:', cleanupError);
    }

    await media.destroy();

    res.status(200).json({
      status: 'success',
      message: 'Hero media deleted',
    });
  } catch (error) {
    console.error('Error deleting hero media:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete hero media',
    });
  }
};
