import { Request, Response } from 'express';
import HubIntroVideo from '../models/hubIntroVideo.model';

// Public projection: only videoUrl/title/description. cloudinaryPublicId and
// uploadedBy are internal and must never leak here.
function toPublicHubVideo(video: HubIntroVideo) {
  return {
    videoUrl: video.videoUrl,
    title: video.title,
    description: video.description,
  };
}

// GET /api/hub-video - public, no auth required. Returns { video: null }
// rather than a 404/error when none has been uploaded yet - "no video yet"
// is a normal state, not an error state.
export const getPublicHubVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    const video = await HubIntroVideo.findOne();

    res.status(200).json({
      status: 'success',
      data: { video: video ? toPublicHubVideo(video) : null },
    });
  } catch (error) {
    console.error('Error fetching public hub intro video:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching the hub intro video',
    });
  }
};
