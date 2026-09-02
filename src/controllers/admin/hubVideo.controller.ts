import { Request, Response } from 'express';
import fs from 'fs';
import HubIntroVideo from '../../models/hubIntroVideo.model';
import cloudinary from '../../utils/cloudinary.utils';

const VIDEO_FOLDER = 'innovation-hub/hub-video';

// POST /api/admin/hub-video - uploads the hub intro video. If one already
// exists, replaces it: deletes the old Cloudinary asset (best-effort - a
// cleanup failure never blocks the new upload) and updates the same row,
// since this table is a singleton enforced here in the application layer.
export const uploadHubVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = req.user as { id: string; role: string };
    const videoFile = req.file as Express.Multer.File | undefined;

    if (!videoFile) {
      res.status(400).json({
        status: 'fail',
        message: 'A video file is required',
      });
      return;
    }

    const { title, description } = req.body;
    const existing = await HubIntroVideo.findOne();

    if (existing) {
      try {
        await cloudinary.uploader.destroy(existing.cloudinaryPublicId, { resource_type: 'video' });
      } catch (cleanupError) {
        console.warn('Failed to delete previous hub intro video from Cloudinary:', cleanupError);
      }
    }

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

    let video;
    if (existing) {
      await existing.update(videoData);
      video = existing;
    } else {
      video = await HubIntroVideo.create({
        ...videoData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    res.status(200).json({
      status: 'success',
      message: existing ? 'Hub intro video replaced' : 'Hub intro video uploaded',
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
    const video = await HubIntroVideo.findOne();

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
// + DB row). Cloudinary cleanup is best-effort - the row is still deleted
// even if the asset deletion fails.
export const deleteHubVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    const video = await HubIntroVideo.findOne();

    if (!video) {
      res.status(404).json({
        status: 'fail',
        message: 'No hub intro video to delete',
      });
      return;
    }

    try {
      await cloudinary.uploader.destroy(video.cloudinaryPublicId, { resource_type: 'video' });
    } catch (cleanupError) {
      console.warn('Failed to delete hub intro video from Cloudinary:', cleanupError);
    }

    await video.destroy();

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
