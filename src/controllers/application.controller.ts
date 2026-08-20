import { Request, Response } from 'express';
import fs from 'fs';
import Application from '../models/application.model';
import cloudinary from '../utils/cloudinary.utils';

// POST /api/applications - public, multipart form-data
export const submitApplication = async (req: Request, res: Response): Promise<void> => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const letterFile = files?.applicationLetter?.[0];
    const imageFile = files?.image?.[0];

    if (!letterFile) {
      res.status(400).json({
        status: 'fail',
        message: 'applicationLetter (a PDF) is required',
      });
      return;
    }

    const { fullName, email, githubUrl, skills, phoneNumber, gender, strengths, weaknesses } = req.body;

    // Reject duplicate pending applications from the same email rather than
    // silently creating a second one.
    const existingPending = await Application.findOne({ where: { email, status: 'Pending' } });
    if (existingPending) {
      res.status(409).json({
        status: 'fail',
        message: 'An application from this email is already pending review',
      });
      return;
    }

    let imageUrl: string | null = null;
    if (imageFile) {
      const imageResult = await cloudinary.uploader.upload(imageFile.path, {
        folder: 'innovation-hub/applications',
        resource_type: 'auto',
      });
      imageUrl = imageResult.secure_url;
      fs.unlinkSync(imageFile.path);
    }

    const letterResult = await cloudinary.uploader.upload(letterFile.path, {
      folder: 'innovation-hub/applications/letters',
      resource_type: 'raw',
    });
    fs.unlinkSync(letterFile.path);

    const application = await Application.create({
      fullName,
      email,
      githubUrl,
      skills,
      phoneNumber,
      gender,
      strengths,
      weaknesses,
      imageUrl,
      applicationLetterUrl: letterResult.secure_url,
      status: 'Pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.status(201).json({
      status: 'success',
      message: 'Application submitted successfully. We will review it and get back to you.',
      data: { application },
    });
  } catch (error) {
    console.error('Error submitting application:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while submitting your application',
    });
  }
};
