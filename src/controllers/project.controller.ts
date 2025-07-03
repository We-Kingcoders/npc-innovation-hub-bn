import { Request, Response } from 'express';
import Project from '../models/project.model';
import User from '../models/user.model';
import cloudinary from "../utils/cloudinary.utils";
import sequelize from 'sequelize';

/**
 * Project Controller
 * Created by: Alain275
 * Created on: 2025-07-03 13:23:21 UTC
 */

// Get all projects (public)
export const getAllProjects = async (req: Request, res: Response): Promise<void> => {
  try {
    // Support for pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12; // Default to 12 projects per page
    const offset = (page - 1) * limit;
    
    // Query with pagination
    const { count, rows: projects } = await Project.findAndCountAll({
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    // Calculate total pages
    const totalPages = Math.ceil(count / limit);

    res.status(200).json({
      status: 'success',
      results: projects.length,
      totalItems: count,
      totalPages,
      currentPage: page,
      data: {
        projects,
      },
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching projects',
    });
  }
};

// Get project by ID (public)
export const getProjectById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const project = await Project.findByPk(id);
    
    if (!project) {
      res.status(404).json({
        status: 'fail',
        message: 'Project not found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: {
        project,
      },
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching project details',
    });
  }
};

// Create project
export const createProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = req.user as { id: string; firstName: string; lastName: string; role: string };
    
    const { title, description, link, demo } = req.body;
    
    if (!title || !description) {
      res.status(400).json({
        status: 'fail',
        message: 'Please provide a title and description for the project',
      });
      return;
    }
    
    // Handle project image upload
    let imageUrl = 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=600';
    if (req.file) {
      // Upload new image
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'innovation-hub/projects',
        resource_type: 'auto',
      });
      imageUrl = result.secure_url;
    }
    
    // Get user information for owner details
    const user = await User.findByPk(currentUser.id);
    const ownerName = `${currentUser.firstName} ${currentUser.lastName}`;
    let ownerAvatar = 'https://randomuser.me/api/portraits/lego/1.jpg';
    
    if (user && user.image) {
      ownerAvatar = user.image;
    }
    
    // Create new project
    const project = await Project.create({
      userId: currentUser.id,
      title,
      description,
      owner: ownerName,
      ownerRole: currentUser.role || 'Project owner',
      ownerAvatar,
      image: imageUrl,
      link: link || '',
      demo: demo || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    res.status(201).json({
      status: 'success',
      message: 'Project created successfully',
      data: {
        project,
      },
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while creating the project',
    });
  }
};

// Update project
export const updateProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUser = req.user as { id: string; firstName: string; lastName: string; role: string };
    
    const { title, description, link, demo } = req.body;
    
    // Find the project
    const project = await Project.findByPk(id);
    
    if (!project) {
      res.status(404).json({
        status: 'fail',
        message: 'Project not found',
      });
      return;
    }
    
    // Any logged in user can update the project - no permission check needed
    
    // Handle project image upload
    let imageUrl = project.image;
    if (req.file) {
      // Delete old image if it exists and isn't the default
      if (project.image && !project.image.includes('pexels-photo-3861969')) {
        const publicId = project.image.split('/').pop()?.split('.')[0];
        if (publicId) {
          await cloudinary.uploader.destroy(`innovation-hub/projects/${publicId}`);
        }
      }
      
      // Upload new image
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'innovation-hub/projects',
        resource_type: 'auto',
      });
      imageUrl = result.secure_url;
    }
    
    // Update project
    await project.update({
      title: title || project.title,
      description: description || project.description,
      image: imageUrl,
      link: link !== undefined ? link : project.link,
      demo: demo !== undefined ? demo : project.demo,
      // Track who last updated the project
      owner: `${currentUser.firstName} ${currentUser.lastName}`,
      ownerRole: currentUser.role || 'Project contributor',
      updatedAt: new Date(),
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Project updated successfully',
      data: {
        project,
      },
    });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while updating the project',
    });
  }
};

// Delete project
export const deleteProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    // Any logged in user can delete projects
    
    // Find the project
    const project = await Project.findByPk(id);
    
    if (!project) {
      res.status(404).json({
        status: 'fail',
        message: 'Project not found',
      });
      return;
    }
    
    // Delete project image if it's not the default
    if (project.image && !project.image.includes('pexels-photo-3861969')) {
      const publicId = project.image.split('/').pop()?.split('.')[0];
      if (publicId) {
        await cloudinary.uploader.destroy(`innovation-hub/projects/${publicId}`);
      }
    }
    
    // Delete the project
    await project.destroy();
    
    res.status(200).json({
      status: 'success',
      message: 'Project deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while deleting the project',
    });
  }
};

// Get my projects
export const getMyProjects = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = req.user as { id: string; role: string };
    
    // Support for pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12; // Default to 12 projects per page
    const offset = (page - 1) * limit;
    
    // Query with pagination
    const { count, rows: projects } = await Project.findAndCountAll({
      where: { userId: currentUser.id },
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    // Calculate total pages
    const totalPages = Math.ceil(count / limit);

    res.status(200).json({
      status: 'success',
      results: projects.length,
      totalItems: count,
      totalPages,
      currentPage: page,
      data: {
        projects,
      },
    });
  } catch (error) {
    console.error('Error fetching my projects:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching your projects',
    });
  }
};

// Search projects
export const searchProjects = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q: searchTerm } = req.query;
    
    if (!searchTerm) {
      res.status(400).json({
        status: 'fail',
        message: 'Please provide a search term',
      });
      return;
    }
    
    // Support for pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const offset = (page - 1) * limit;
    
    // Search in title and description
    const { count, rows: projects } = await Project.findAndCountAll({
      where: {
        [sequelize.Op.or]: [
          { title: { [sequelize.Op.iLike]: `%${searchTerm}%` } },
          { description: { [sequelize.Op.iLike]: `%${searchTerm}%` } },
          { owner: { [sequelize.Op.iLike]: `%${searchTerm}%` } }
        ]
      },
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });
    
    // Calculate total pages
    const totalPages = Math.ceil(count / limit);
    
    res.status(200).json({
      status: 'success',
      results: projects.length,
      totalItems: count,
      totalPages,
      currentPage: page,
      data: {
        projects,
      },
    });
  } catch (error) {
    console.error('Error searching projects:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while searching for projects',
    });
  }
};