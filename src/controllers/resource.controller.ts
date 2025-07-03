/**
 * Resource Controller
 * Admin-only CRUD operations with read access for all authenticated users
 * Includes video upload support and PATCH method for partial updates
 * Fixed URL validation issue
 * 
 * @created_by Alain275
 * @created_at 2025-07-03 19:48:28 UTC
 */

import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { Resource, ResourceUpvote, SavedResource, ResourceType } from '../models/resource.model';
import User from '../models/user.model';
import cloudinary from "../utils/cloudinary.utils";
import sequelize from '../config/database';
import { Op } from 'sequelize';

// Get all resources (for authenticated users)
export const getAllResources = async (req: Request, res: Response): Promise<void> => {
  try {
    // Support for pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const offset = (page - 1) * limit;
    
    // Support for filtering by category, type, and difficulty
    const category = req.query.category as string;
    const type = req.query.type as string;
    const difficulty = req.query.difficulty as string;
    
    // Build the where clause
    const whereClause: any = {};
    if (category) whereClause.category = category;
    if (type) whereClause.type = type;
    if (difficulty) whereClause.difficulty = difficulty;
    
    // Query with pagination and filters
    const { count, rows: resources } = await Resource.findAndCountAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      include: [
        {
          model: User,
          attributes: ['firstName', 'lastName', 'image']
        }
      ]
    });

    // Calculate total pages
    const totalPages = Math.ceil(count / limit);

    res.status(200).json({
      status: 'success',
      results: resources.length,
      totalItems: count,
      totalPages,
      currentPage: page,
      data: {
        resources,
      },
    });
  } catch (error) {
    console.error('Error fetching resources:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching resources',
    });
  }
};

// Get resource by ID (for authenticated users)
export const getResourceById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const resource = await Resource.findByPk(id, {
      include: [
        {
          model: User,
          attributes: ['firstName', 'lastName', 'image']
        }
      ]
    });
    
    if (!resource) {
      res.status(404).json({
        status: 'fail',
        message: 'Resource not found',
      });
      return;
    }

    // Check if current user has upvoted this resource
    const currentUser = req.user as { id: string };
    const hasUpvoted = await ResourceUpvote.findOne({
      where: {
        resourceId: id,
        userId: currentUser.id
      }
    });
    
    // Check if current user has saved this resource
    const hasSaved = await SavedResource.findOne({
      where: {
        resourceId: id,
        userId: currentUser.id
      }
    });

    res.status(200).json({
      status: 'success',
      data: {
        resource,
        userInteraction: {
          hasUpvoted: !!hasUpvoted,
          hasSaved: !!hasSaved
        }
      },
    });
  } catch (error) {
    console.error('Error fetching resource:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching resource details',
    });
  }
};

// Create resource (admin only)
export const createResource = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = req.user as { id: string; role: string };
    
    // Check if user is admin
    if (currentUser.role !== 'Admin') {
      res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to create resources',
      });
      return;
    }
    
    const { 
      title, 
      description, 
      category, 
      type, 
      difficulty, 
      url, 
      author, 
      isPaid, 
      price, 
      purchaseDate, 
      platform, 
      tags,
      duration
    } = req.body;
    
    if (!title || !description || !category || !type || !author) {
      res.status(400).json({
        status: 'fail',
        message: 'Please provide all required fields',
      });
      return;
    }
    
    // For video type, either URL or video file is required
    if (
      type === ResourceType.VIDEO &&
      !url &&
      (
        !req.files ||
        (typeof req.files === 'object' && !Array.isArray(req.files) && !req.files['video'])
      )
    ) {
      res.status(400).json({
        status: 'fail',
        message: 'For video resources, please provide either a URL or upload a video file',
      });
      return;
    }
    
    // Handle file uploads
    let imageUrl;
    let videoUrl;
    let isHosted = false;
    
    if (
      req.files &&
      typeof req.files === 'object' &&
      !Array.isArray(req.files)
    ) {
      // Handle image file
      if (
        typeof req.files === 'object' &&
        !Array.isArray(req.files) &&
        (req.files as { [fieldname: string]: Express.Multer.File[] })['image'] &&
        (req.files as { [fieldname: string]: Express.Multer.File[] })['image'][0]
      ) {
        const imageFile = (req.files as { [fieldname: string]: Express.Multer.File[] })['image'][0];
        const imageResult = await cloudinary.uploader.upload(imageFile.path, {
          folder: 'innovation-hub/resources',
          resource_type: 'image',
        });
        imageUrl = imageResult.secure_url;
        
        // Delete local file after upload
        fs.unlinkSync(imageFile.path);
      }
      
      // Handle video file
      if (req.files['video'] && req.files['video'][0]) {
        const videoFile = req.files['video'][0];
        
        // For videos, we use Cloudinary with resource_type: 'video'
        const videoResult = await cloudinary.uploader.upload(videoFile.path, {
          folder: 'innovation-hub/resources/videos',
          resource_type: 'video',
          // Add video-specific options
          eager: [
            { format: 'mp4', transformation: [
              { width: 1280, height: 720, crop: 'limit' },
              { quality: 'auto' }
            ]}
          ],
          eager_async: true,
        });
        videoUrl = videoResult.secure_url;
        isHosted = true;
        
        // Delete local file after upload
        fs.unlinkSync(videoFile.path);
      }
    }
    
    // Parse tags if they came as a string
    let parsedTags = tags;
    if (typeof tags === 'string') {
      parsedTags = tags.split(',').map((tag: string) => tag.trim());
    }
    
    // Handle URL for hosted videos or empty strings
    let resourceUrl = url;
    if (isHosted || !url || url === '' || url === 'string') {
      resourceUrl = null;
    }
    
    // Create new resource
    const resource = await Resource.create({
      userId: currentUser.id,
      title,
      description,
      category,
      type,
      difficulty,
      url: resourceUrl,
      imageUrl,
      videoUrl,
      author,
      isPaid: isPaid === 'true' || isPaid === true,
      price: price || 0,
      purchaseDate: purchaseDate || new Date(),
      platform,
      tags: parsedTags,
      isFeatured: false,
      isHosted,
      duration: duration || 0,
      upvotes: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    res.status(201).json({
      status: 'success',
      message: 'Resource created successfully',
      data: {
        resource,
      },
    });
  } catch (error) {
    console.error('Error creating resource:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while creating the resource',
    });
  }
};

// Update resource (admin only)
export const updateResource = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUser = req.user as { id: string; role: string };
    
    // Check if user is admin
    if (currentUser.role !== 'Admin') {
      res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to update resources',
      });
      return;
    }
    
    const { 
      title, 
      description, 
      category, 
      type, 
      difficulty, 
      url, 
      author, 
      isPaid, 
      price, 
      purchaseDate, 
      platform, 
      tags,
      isFeatured,
      duration
    } = req.body;
    
    // Find the resource
    const resource = await Resource.findByPk(id);
    
    if (!resource) {
      res.status(404).json({
        status: 'fail',
        message: 'Resource not found',
      });
      return;
    }
    
    // Handle file uploads
    let imageUrl = resource.imageUrl;
    let videoUrl = resource.videoUrl;
    let isHosted = resource.isHosted;
    
    if (
      req.files &&
      typeof req.files === 'object' &&
      !Array.isArray(req.files)
    ) {
      // Handle image file
      const filesObj = req.files as { [fieldname: string]: Express.Multer.File[] };
      if (
        filesObj['image'] &&
        filesObj['image'][0]
      ) {
        // Delete old image if it exists and isn't a default pexels image
        if (resource.imageUrl && !resource.imageUrl.includes('pexels-photo')) {
          const publicId = resource.imageUrl.split('/').pop()?.split('.')[0];
          if (publicId) {
            await cloudinary.uploader.destroy(`innovation-hub/resources/${publicId}`);
          }
        }
        
        // Upload new image
        const imageFile = filesObj['image'][0];
        const imageResult = await cloudinary.uploader.upload(imageFile.path, {
          folder: 'innovation-hub/resources',
          resource_type: 'image',
        });
        imageUrl = imageResult.secure_url;
        
        // Delete local file after upload
        fs.unlinkSync(imageFile.path);
      }
      
      // Handle video file
      if (filesObj['video'] && filesObj['video'][0]) {
        // Delete old video if it exists
        if (resource.videoUrl) {
          const publicId = resource.videoUrl.split('/').pop()?.split('.')[0];
          if (publicId) {
            await cloudinary.uploader.destroy(`innovation-hub/resources/videos/${publicId}`, { resource_type: 'video' });
          }
        }
        
        // Upload new video
        const videoFile = filesObj['video'][0];
        const videoResult = await cloudinary.uploader.upload(videoFile.path, {
          folder: 'innovation-hub/resources/videos',
          resource_type: 'video',
          eager: [
            { format: 'mp4', transformation: [
              { width: 1280, height: 720, crop: 'limit' },
              { quality: 'auto' }
            ]}
          ],
          eager_async: true,
        });
        videoUrl = videoResult.secure_url;
        isHosted = true;
        
        // Delete local file after upload
        fs.unlinkSync(videoFile.path);
      }
    }
    
    // Parse tags if they came as a string
    let parsedTags = tags;
    if (typeof tags === 'string') {
      parsedTags = tags.split(',').map((tag: string) => tag.trim());
    }
    
    // Handle URL for hosted videos or empty strings
    let resourceUrl = url;
    if (isHosted || !url || url === '' || url === 'string') {
      resourceUrl = null;
    }
    
    // Update resource
    await resource.update({
      title: title || resource.title,
      description: description || resource.description,
      category: category || resource.category,
      type: type || resource.type,
      difficulty: difficulty || resource.difficulty,
      url: resourceUrl,
      imageUrl,
      videoUrl,
      author: author || resource.author,
      isPaid: isPaid !== undefined ? (isPaid === 'true' || isPaid === true) : resource.isPaid,
      price: price !== undefined ? price : resource.price,
      purchaseDate: purchaseDate || resource.purchaseDate,
      platform: platform !== undefined ? platform : resource.platform,
      tags: parsedTags || resource.tags,
      isFeatured: isFeatured !== undefined ? (isFeatured === 'true' || isFeatured === true) : resource.isFeatured,
      isHosted,
      duration: duration || resource.duration,
      updatedAt: new Date(),
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Resource updated successfully',
      data: {
        resource,
      },
    });
  } catch (error) {
    console.error('Error updating resource:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while updating the resource',
    });
  }
};

// Patch update resource (admin only)
export const patchResource = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUser = req.user as { id: string; role: string };
    
    // Check if user is admin
    if (currentUser.role !== 'Admin') {
      res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to update resources',
      });
      return;
    }
    
    // Find the resource
    const resource = await Resource.findByPk(id);
    
    if (!resource) {
      res.status(404).json({
        status: 'fail',
        message: 'Resource not found',
      });
      return;
    }
    
    // Get the fields to update from request body
    const updateData: any = {};
    const allowedFields = [
      'title', 'description', 'category', 'type', 'difficulty', 
      'url', 'author', 'isPaid', 'price', 'purchaseDate', 
      'platform', 'tags', 'isFeatured', 'duration'
    ];
    
    // Only add fields that are present in the request
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        // Special handling for isPaid and isFeatured (convert string to boolean)
        if (field === 'isPaid' || field === 'isFeatured') {
          updateData[field] = req.body[field] === 'true' || req.body[field] === true;
        }
        // Special handling for tags (convert comma-separated string to array)
        else if (field === 'tags' && typeof req.body.tags === 'string') {
          updateData[field] = req.body.tags.split(',').map((tag: string) => tag.trim());
        }
        // Special handling for URL to ensure it's valid or null
        else if (field === 'url') {
          // If URL is empty string, make it null to avoid validation errors
          if (req.body.url === '' || req.body.url === 'string' || !req.body.url) {
            updateData[field] = null;
          } else {
            // Otherwise use the provided URL
            updateData[field] = req.body.url;
          }
        }
        // Normal field assignment
        else {
          updateData[field] = req.body[field];
        }
      }
    });
    
    // Handle file uploads if present
    let isHosted = resource.isHosted;
    
    if (
      req.files &&
      typeof req.files === 'object' &&
      !Array.isArray(req.files)
    ) {
      const filesObj = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      // Handle image file
      if (
        filesObj['image'] &&
        filesObj['image'][0]
      ) {
        // Delete old image if it exists and isn't a default pexels image
        if (resource.imageUrl && !resource.imageUrl.includes('pexels-photo')) {
          const publicId = resource.imageUrl.split('/').pop()?.split('.')[0];
          if (publicId) {
            await cloudinary.uploader.destroy(`innovation-hub/resources/${publicId}`);
          }
        }
        
        // Upload new image
        const imageFile = filesObj['image'][0];
        const imageResult = await cloudinary.uploader.upload(imageFile.path, {
          folder: 'innovation-hub/resources',
          resource_type: 'image',
        });
        updateData.imageUrl = imageResult.secure_url;
        
        // Delete local file after upload
        fs.unlinkSync(imageFile.path);
      }
      
      // Handle video file
      if (filesObj['video'] && filesObj['video'][0]) {
        // Delete old video if it exists
        if (resource.videoUrl) {
          const publicId = resource.videoUrl.split('/').pop()?.split('.')[0];
          if (publicId) {
            await cloudinary.uploader.destroy(`innovation-hub/resources/videos/${publicId}`, { resource_type: 'video' });
          }
        }
        
        // Upload new video
        const videoFile = filesObj['video'][0];
        const videoResult = await cloudinary.uploader.upload(videoFile.path, {
          folder: 'innovation-hub/resources/videos',
          resource_type: 'video',
          eager: [
            { format: 'mp4', transformation: [
              { width: 1280, height: 720, crop: 'limit' },
              { quality: 'auto' }
            ]}
          ],
          eager_async: true,
        });
        updateData.videoUrl = videoResult.secure_url;
        updateData.isHosted = true;
        isHosted = true;
        
        // Delete local file after upload
        fs.unlinkSync(videoFile.path);
      }
    }
    
    // If this is a hosted video, ensure URL is null
    if ((isHosted || updateData.isHosted) && updateData.url !== undefined) {
      updateData.url = null;
    }
    
    // Always update the updatedAt timestamp
    updateData.updatedAt = new Date();
    
    // Only update if there are fields to update
    if (Object.keys(updateData).length === 0) {
      res.status(400).json({
        status: 'fail',
        message: 'No fields to update were provided',
      });
      return;
    }
    
    // Update the resource with only the provided fields
    await resource.update(updateData);
    
    // Fetch the updated resource to return
    const updatedResource = await Resource.findByPk(id);
    
    res.status(200).json({
      status: 'success',
      message: 'Resource updated successfully',
      data: {
        resource: updatedResource,
      },
    });
  } catch (error) {
    console.error('Error updating resource:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while updating the resource',
    });
  }
};

// Delete resource (admin only)
export const deleteResource = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUser = req.user as { id: string; role: string };
    
    // Check if user is admin
    if (currentUser.role !== 'Admin') {
      res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to delete resources',
      });
      return;
    }
    
    // Find the resource
    const resource = await Resource.findByPk(id);
    
    if (!resource) {
      res.status(404).json({
        status: 'fail',
        message: 'Resource not found',
      });
      return;
    }
    
    // Delete resource image if it's not a default pexels image
    if (resource.imageUrl && !resource.imageUrl.includes('pexels-photo')) {
      const imagePublicId = resource.imageUrl.split('/').pop()?.split('.')[0];
      if (imagePublicId) {
        await cloudinary.uploader.destroy(`innovation-hub/resources/${imagePublicId}`);
      }
    }
    
    // Delete resource video if it exists
    if (resource.videoUrl) {
      const videoPublicId = resource.videoUrl.split('/').pop()?.split('.')[0];
      if (videoPublicId) {
        await cloudinary.uploader.destroy(`innovation-hub/resources/videos/${videoPublicId}`, { resource_type: 'video' });
      }
    }
    
    // Delete the resource
    await resource.destroy();
    
    res.status(200).json({
      status: 'success',
      message: 'Resource deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting resource:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while deleting the resource',
    });
  }
};

// Get featured resources (for authenticated users)
export const getFeaturedResources = async (req: Request, res: Response): Promise<void> => {
  try {
    const resources = await Resource.findAll({
      where: { isFeatured: true },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          attributes: ['firstName', 'lastName', 'image']
        }
      ],
      limit: 6
    });

    res.status(200).json({
      status: 'success',
      results: resources.length,
      data: {
        resources,
      },
    });
  } catch (error) {
    console.error('Error fetching featured resources:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching featured resources',
    });
  }
};

// Upvote a resource
export const upvoteResource = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUser = req.user as { id: string };
    
    // Find the resource
    const resource = await Resource.findByPk(id);
    
    if (!resource) {
      res.status(404).json({
        status: 'fail',
        message: 'Resource not found',
      });
      return;
    }
    
    // Check if user has already upvoted this resource
    const existingUpvote = await ResourceUpvote.findOne({
      where: {
        resourceId: id,
        userId: currentUser.id
      }
    });
    
    if (existingUpvote) {
      // Remove upvote
      await existingUpvote.destroy();
      
      // Decrement upvote count
      await resource.update({
        upvotes: resource.upvotes - 1,
      });
      
      res.status(200).json({
        status: 'success',
        message: 'Resource upvote removed',
        data: {
          hasUpvoted: false,
          upvotes: resource.upvotes - 1,
        },
      });
    } else {
      // Add upvote
      await ResourceUpvote.create({
        resourceId: id,
        userId: currentUser.id,
        createdAt: new Date(),
      });
      
      // Increment upvote count
      await resource.update({
        upvotes: resource.upvotes + 1,
      });
      
      res.status(200).json({
        status: 'success',
        message: 'Resource upvoted successfully',
        data: {
          hasUpvoted: true,
          upvotes: resource.upvotes + 1,
        },
      });
    }
  } catch (error) {
    console.error('Error upvoting resource:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while upvoting the resource',
    });
  }
};

// Save a resource
export const saveResource = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUser = req.user as { id: string };
    
    // Find the resource
    const resource = await Resource.findByPk(id);
    
    if (!resource) {
      res.status(404).json({
        status: 'fail',
        message: 'Resource not found',
      });
      return;
    }
    
    // Check if user has already saved this resource
    const existingSave = await SavedResource.findOne({
      where: {
        resourceId: id,
        userId: currentUser.id
      }
    });
    
    if (existingSave) {
      // Remove from saved
      await existingSave.destroy();
      
      res.status(200).json({
        status: 'success',
        message: 'Resource removed from saved',
        data: {
          hasSaved: false,
        },
      });
    } else {
      // Add to saved
      await SavedResource.create({
        resourceId: id,
        userId: currentUser.id,
        createdAt: new Date(),
      });
      
      res.status(200).json({
        status: 'success',
        message: 'Resource saved successfully',
        data: {
          hasSaved: true,
        },
      });
    }
  } catch (error) {
    console.error('Error saving resource:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while saving the resource',
    });
  }
};

// Get user's saved resources
export const getSavedResources = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = req.user as { id: string };
    
    // Support for pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const offset = (page - 1) * limit;
    
    // Find all saved resources for this user
    const { count, rows: savedResources } = await SavedResource.findAndCountAll({
      where: { userId: currentUser.id },
      include: [
        {
          model: Resource,
          include: [
            {
              model: User,
              attributes: ['firstName', 'lastName', 'image']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });
    
    // Extract the resources from the saved resources
    const resources = savedResources.map(saved => saved.get('Resource'));
    
    // Calculate total pages
    const totalPages = Math.ceil(count / limit);

    res.status(200).json({
      status: 'success',
      results: resources.length,
      totalItems: count,
      totalPages,
      currentPage: page,
      data: {
        resources,
      },
    });
  } catch (error) {
    console.error('Error fetching saved resources:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching saved resources',
    });
  }
};

// Search resources
export const searchResources = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q: searchTerm } = req.query;
    
    if (!searchTerm) {
      res.status(400).json({
        status: 'fail',
        message: 'Please provide a search term',
      });
      return;
    }

    // Ensure searchTerm is a string for tags search
    const searchTag = typeof searchTerm === 'string' ? searchTerm : String(searchTerm);

    // Support for pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const offset = (page - 1) * limit;
    
    // Search in title, description, author, and tags
    const { count, rows: resources } = await Resource.findAndCountAll({
      where: {
        [Op.or]: [
          { title: { [Op.iLike]: `%${searchTag}%` } },
          { description: { [Op.iLike]: `%${searchTag}%` } },
          { author: { [Op.iLike]: `%${searchTag}%` } },
          { tags: { [Op.contains]: [searchTag] } }
        ]
      },
      include: [
        {
          model: User,
          attributes: ['firstName', 'lastName', 'image']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });
    
    // Calculate total pages
    const totalPages = Math.ceil(count / limit);
    
    res.status(200).json({
      status: 'success',
      results: resources.length,
      totalItems: count,
      totalPages,
      currentPage: page,
      data: {
        resources,
      },
    });
  } catch (error) {
    console.error('Error searching resources:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while searching for resources',
    });
  }
};

// Get resources by category
export const getResourcesByCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category } = req.params;
    
    // Support for pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const offset = (page - 1) * limit;
    
    // Query with pagination
    const { count, rows: resources } = await Resource.findAndCountAll({
      where: { category },
      include: [
        {
          model: User,
          attributes: ['firstName', 'lastName', 'image']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });
    
    // Calculate total pages
    const totalPages = Math.ceil(count / limit);
    
    res.status(200).json({
      status: 'success',
      results: resources.length,
      totalItems: count,
      totalPages,
      currentPage: page,
      data: {
        resources,
      },
    });
  } catch (error) {
    console.error('Error fetching resources by category:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching resources',
    });
  }
};

// Get resources by type
export const getResourcesByType = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type } = req.params;
    
    // Support for pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const offset = (page - 1) * limit;
    
    // Query with pagination
    const { count, rows: resources } = await Resource.findAndCountAll({
      where: { type },
      include: [
        {
          model: User,
          attributes: ['firstName', 'lastName', 'image']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });
    
    // Calculate total pages
    const totalPages = Math.ceil(count / limit);
    
    res.status(200).json({
      status: 'success',
      results: resources.length,
      totalItems: count,
      totalPages,
      currentPage: page,
      data: {
        resources,
      },
    });
  } catch (error) {
    console.error('Error fetching resources by type:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching resources',
    });
  }
};

// Get video resources
export const getVideoResources = async (req: Request, res: Response): Promise<void> => {
  try {
    // Support for pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const offset = (page - 1) * limit;
    
    // Query with pagination
    const { count, rows: resources } = await Resource.findAndCountAll({
      where: { type: ResourceType.VIDEO },
      include: [
        {
          model: User,
          attributes: ['firstName', 'lastName', 'image']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });
    
    // Calculate total pages
    const totalPages = Math.ceil(count / limit);
    
    res.status(200).json({
      status: 'success',
      results: resources.length,
      totalItems: count,
      totalPages,
      currentPage: page,
      data: {
        resources,
      },
    });
  } catch (error) {
    console.error('Error fetching video resources:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching video resources',
    });
  }
};