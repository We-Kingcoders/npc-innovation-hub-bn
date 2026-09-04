import { Request, Response } from 'express';
import fs from 'fs';
import Alumnus from '../../models/alumnus.model';
import cloudinary from '../../utils/cloudinary.utils';

const ALUMNI_FOLDER = 'innovation-hub/alumni';

// POST /api/admin/alumni - registers a standalone alumnus (no platform
// account, display-only). Photo is optional.
export const createAlumnus = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = req.user as { id: string; role: string };
    const { fullName, role } = req.body;
    const imageFile = req.file as Express.Multer.File | undefined;

    let imageUrl: string | null = null;
    let cloudinaryPublicId: string | null = null;

    if (imageFile) {
      const uploadResult = await cloudinary.uploader.upload(imageFile.path, {
        folder: ALUMNI_FOLDER,
        resource_type: 'image',
      });
      imageUrl = uploadResult.secure_url;
      cloudinaryPublicId = uploadResult.public_id;
      fs.unlinkSync(imageFile.path);
    }

    const alumnus = await Alumnus.create({
      fullName,
      role,
      imageUrl,
      cloudinaryPublicId,
      createdBy: currentUser.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.status(201).json({
      status: 'success',
      message: 'Alumnus registered',
      data: { alumnus },
    });
  } catch (error) {
    console.error('Error creating alumnus:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to register alumnus',
    });
  }
};

// GET /api/admin/alumni - admin management list of standalone alumni
export const getAlumniAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const alumni = await Alumnus.findAll({ order: [['createdAt', 'DESC']] });

    res.status(200).json({
      status: 'success',
      results: alumni.length,
      data: { alumni },
    });
  } catch (error) {
    console.error('Error fetching alumni:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch alumni',
    });
  }
};

// PATCH /api/admin/alumni/:id - edits fullName/role and/or replaces the
// photo. Replacing the photo deletes the old Cloudinary asset (best-effort -
// a cleanup failure never blocks the update).
export const updateAlumnus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const alumnus = await Alumnus.findByPk(id);
    if (!alumnus) {
      res.status(404).json({
        status: 'fail',
        message: 'Alumnus not found',
      });
      return;
    }

    const { fullName, role } = req.body;
    const imageFile = req.file as Express.Multer.File | undefined;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (fullName !== undefined) updateData.fullName = fullName;
    if (role !== undefined) updateData.role = role;

    if (imageFile) {
      if (alumnus.cloudinaryPublicId) {
        try {
          await cloudinary.uploader.destroy(alumnus.cloudinaryPublicId, { resource_type: 'image' });
        } catch (cleanupError) {
          console.warn('Failed to delete previous alumnus photo from Cloudinary:', cleanupError);
        }
      }

      const uploadResult = await cloudinary.uploader.upload(imageFile.path, {
        folder: ALUMNI_FOLDER,
        resource_type: 'image',
      });
      updateData.imageUrl = uploadResult.secure_url;
      updateData.cloudinaryPublicId = uploadResult.public_id;
      fs.unlinkSync(imageFile.path);
    }

    await alumnus.update(updateData);

    res.status(200).json({
      status: 'success',
      message: 'Alumnus updated',
      data: { alumnus },
    });
  } catch (error) {
    console.error('Error updating alumnus:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update alumnus',
    });
  }
};

// DELETE /api/admin/alumni/:id - deletes the Cloudinary asset (if one
// exists, best-effort) and the DB row.
export const deleteAlumnus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const alumnus = await Alumnus.findByPk(id);
    if (!alumnus) {
      res.status(404).json({
        status: 'fail',
        message: 'Alumnus not found',
      });
      return;
    }

    if (alumnus.cloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(alumnus.cloudinaryPublicId, { resource_type: 'image' });
      } catch (cleanupError) {
        console.warn('Failed to delete alumnus photo from Cloudinary:', cleanupError);
      }
    }

    await alumnus.destroy();

    res.status(200).json({
      status: 'success',
      message: 'Alumnus deleted',
    });
  } catch (error) {
    console.error('Error deleting alumnus:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete alumnus',
    });
  }
};
