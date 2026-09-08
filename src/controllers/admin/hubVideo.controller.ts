import { Request, Response } from 'express';
import fs from 'fs';
import HubIntroVideo from '../../models/hubIntroVideo.model';
import cloudinary from '../../utils/cloudinary.utils';
import sequelize from '../../config/database';

const VIDEO_FOLDER = 'innovation-hub/hub-video';

// All findOne() lookups on this "singleton" table order by createdAt so that
// IF duplicate rows ever exist (see the advisory-lock note below - this is
// meant to be impossible going forward, but wasn't always guarded), every
// endpoint (public GET, admin GET, delete) consistently treats the oldest
// row as *the* hub video instead of an arbitrary one. Without this, admin
// and public views could each show a different row, and delete could remove
// the "wrong" one while the video kept appearing to still exist.
const SINGLETON_ORDER: [string, 'ASC'][] = [['createdAt', 'ASC']];

// Postgres advisory lock key serializing all uploads. findOne()-then-create
// is a check-then-act race: two concurrent uploads (most likely the very
// first upload ever, before any row exists) can both see "no row yet" and
// both insert, silently breaking the singleton invariant since there's no
// unique constraint backing it at the DB level. A transaction-scoped
// advisory lock (auto-released on commit/rollback) fully serializes this
// code path so the second request always observes the first request's row.
const HUB_VIDEO_LOCK_KEY = 851_001; // arbitrary, just needs to be stable

// POST /api/admin/hub-video - uploads the hub intro video. If one already
// exists, replaces it and updates the same row, since this table is a
// singleton enforced here in the application layer (see SINGLETON_ORDER and
// HUB_VIDEO_LOCK_KEY above). The old Cloudinary asset is only deleted AFTER
// the new one is safely committed to the database - if we deleted it first
// (the previous order) and the new upload then failed, the hub would end up
// with no video at all instead of just keeping the old one.
export const uploadHubVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = req.user as { id: string; role: string };
    const videoFile = req.file;

    if (!videoFile) {
      res.status(400).json({
        status: 'fail',
        message: 'A video file is required',
      });
      return;
    }

    const { title, description } = req.body;

    const uploadResult = await cloudinary.uploader.upload(videoFile.path, {
      folder: VIDEO_FOLDER,
      resource_type: 'video',
    });
    fs.unlinkSync(videoFile.path);

    const videoData = {
      videoUrl: uploadResult.secure_url,
      cloudinaryPublicId: uploadResult.public_id,
      title: title || null,
      description: description || null,
      uploadedBy: currentUser.id,
    };

    const { video, replaced, oldCloudinaryPublicId } = await sequelize.transaction(
      async (t) => {
        await sequelize.query('SELECT pg_advisory_xact_lock($1)', {
          bind: [HUB_VIDEO_LOCK_KEY],
          transaction: t,
        });

        const existing = await HubIntroVideo.findOne({
          order: SINGLETON_ORDER,
          transaction: t,
        });

        if (existing) {
          const oldPublicId = existing.cloudinaryPublicId;
          await existing.update(videoData, { transaction: t });
          return { video: existing, replaced: true, oldCloudinaryPublicId: oldPublicId };
        }

        const created = await HubIntroVideo.create(
          { ...videoData, createdAt: new Date(), updatedAt: new Date() },
          { transaction: t },
        );
        return { video: created, replaced: false, oldCloudinaryPublicId: null as string | null };
      },
    );

    if (oldCloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(oldCloudinaryPublicId, { resource_type: 'video' });
      } catch (cleanupError) {
        console.warn('Failed to delete previous hub intro video from Cloudinary:', cleanupError);
      }
    }

    res.status(200).json({
      status: 'success',
      message: replaced ? 'Hub intro video replaced' : 'Hub intro video uploaded',
      data: { video },
    });
  } catch (error) {
    console.error('Error uploading hub intro video:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to upload hub intro video',
    });
  }
};

// GET /api/admin/hub-video - full record for the admin, including
// cloudinaryPublicId and uploadedBy (internal fields never exposed publicly).
export const getHubVideoAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const video = await HubIntroVideo.findOne({ order: SINGLETON_ORDER });

    if (!video) {
      res.status(200).json({
        status: 'success',
        message: 'No hub intro video has been uploaded yet',
        data: { video: null },
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: { video },
    });
  } catch (error) {
    console.error('Error fetching hub intro video:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch hub intro video',
    });
  }
};

// DELETE /api/admin/hub-video - removes the video entirely (Cloudinary asset
// + DB row). Cloudinary cleanup is best-effort - rows are still deleted even
// if an asset deletion fails. Deletes every row, not just the first match:
// since nothing at the DB level actually prevents more than one row (see the
// singleton note on the model), this doubles as a self-heal - if a stray
// duplicate ever existed, "delete" now genuinely means no video, instead of
// silently leaving an orphan row that keeps appearing for the next request.
export const deleteHubVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    const videos = await HubIntroVideo.findAll({ order: SINGLETON_ORDER });

    if (videos.length === 0) {
      res.status(404).json({
        status: 'fail',
        message: 'No hub intro video to delete',
      });
      return;
    }

    for (const video of videos) {
      try {
        await cloudinary.uploader.destroy(video.cloudinaryPublicId, { resource_type: 'video' });
      } catch (cleanupError) {
        console.warn('Failed to delete hub intro video from Cloudinary:', cleanupError);
      }
    }

    await HubIntroVideo.destroy({ where: { id: videos.map((v) => v.id) } });

    res.status(200).json({
      status: 'success',
      message: 'Hub intro video deleted',
    });
  } catch (error) {
    console.error('Error deleting hub intro video:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete hub intro video',
    });
  }
};
