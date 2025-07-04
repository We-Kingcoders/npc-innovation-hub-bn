import { Request, Response } from 'express';
import Event from '../models/event.model';
import Attendance from '../models/attendance.model';
import User from '../models/user.model';
import cloudinary from '../utils/cloudinary.utils';
import { Op } from 'sequelize';


// Get all events with pagination and optional filtering
export const getAllEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    // Support for pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    // Support for filtering
    const filter = req.query.filter as string || 'all'; // 'all', 'upcoming', 'past'
    
    // Build where clause based on filter
    let whereClause = {};
    const currentDate = new Date();
    
    if (filter === 'upcoming') {
      whereClause = {
        startTime: {
          [Op.gte]: currentDate
        }
      };
    } else if (filter === 'past') {
      whereClause = {
        endTime: {
          [Op.lt]: currentDate
        }
      };
    }

    // Support for sorting
    const sortBy = req.query.sortBy as string || 'startTime';
    const sortOrder = req.query.sortOrder as string || 'ASC';
    
    // Query with pagination and filtering
    const { count, rows: events } = await Event.findAndCountAll({
      where: whereClause,
      order: [[sortBy, sortOrder]],
      limit,
      offset,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'image']
        }
      ]
    });

    // Calculate total pages
    const totalPages = Math.ceil(count / limit);

    res.status(200).json({
      status: 'success',
      results: events.length,
      totalItems: count,
      totalPages,
      currentPage: page,
      data: {
        events,
      },
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching events',
    });
  }
};

// Get a specific event by ID
export const getEventById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const event = await Event.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'image']
        }
      ]
    });
    
    if (!event) {
      res.status(404).json({
        status: 'fail',
        message: 'Event not found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: {
        event,
      },
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching event details',
    });
  }
};

// Update the createEvent function to handle missing image files
export const createEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = req.user as { id: string; role: string };
    
    // Check if user is an admin
    if (currentUser.role !== 'Admin') {
      res.status(403).json({
        status: 'fail',
        message: 'Only administrators can create events',
      });
      return;
    }
    
    const { title, location, startTime, endTime, description } = req.body;
    
    // Validate required fields
    if (!title || !location || !startTime || !endTime || !description) {
      res.status(400).json({
        status: 'fail',
        message: 'Please provide all required event details',
      });
      return;
    }
    
    // Validate that end time is after start time
    if (new Date(endTime) <= new Date(startTime)) {
      res.status(400).json({
        status: 'fail',
        message: 'End time must be after start time',
      });
      return;
    }
    
    // Handle image upload if provided and valid
    let imageUrl = undefined;
    if (req.file) {
      // Upload image to cloudinary
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'innovation-hub/events',
        resource_type: 'auto',
      });
      imageUrl = result.secure_url;
    }
    
    // Create the event
    const event = await Event.create({
      title,
      location,
      description,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      imageUrl,
      createdBy: currentUser.id,
    });
    
    res.status(201).json({
      status: 'success',
      message: 'Event created successfully',
      data: {
        event,
      },
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while creating the event',
    });
  }
};

// Update an existing event (Admin only)
export const updateEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUser = req.user as { id: string; role: string };
    
    // Check if user is an admin
    if (currentUser.role !== 'Admin') {
      res.status(403).json({
        status: 'fail',
        message: 'Only administrators can update events',
      });
      return;
    }
    
    // Find the event
    const event = await Event.findByPk(id);
    
    if (!event) {
      res.status(404).json({
        status: 'fail',
        message: 'Event not found',
      });
      return;
    }
    
    // Create update object with only provided fields
    const updateData: any = {};
    
    // Only add fields that are present in the request
    if ('title' in req.body) updateData.title = req.body.title;
    if ('location' in req.body) updateData.location = req.body.location;
    if ('description' in req.body) updateData.description = req.body.description;
    if ('startTime' in req.body) updateData.startTime = new Date(req.body.startTime);
    if ('endTime' in req.body) updateData.endTime = new Date(req.body.endTime);
    
    // Validate that end time is after start time if both are provided
    if (updateData.startTime && updateData.endTime) {
      if (updateData.endTime <= updateData.startTime) {
        res.status(400).json({
          status: 'fail',
          message: 'End time must be after start time',
        });
        return;
      }
    } else if (updateData.startTime && !updateData.endTime) {
      // If only start time is provided, validate against existing end time
      if (new Date(updateData.startTime) >= new Date(event.endTime)) {
        res.status(400).json({
          status: 'fail',
          message: 'Start time must be before the existing end time',
        });
        return;
      }
    } else if (!updateData.startTime && updateData.endTime) {
      // If only end time is provided, validate against existing start time
      if (new Date(updateData.endTime) <= new Date(event.startTime)) {
        res.status(400).json({
          status: 'fail',
          message: 'End time must be after the existing start time',
        });
        return;
      }
    }
    
    // Handle image upload if provided
    if (req.file) {
      // Delete old image if it exists
      if (event.imageUrl) {
        const publicId = event.imageUrl.split('/').pop()?.split('.')[0];
        if (publicId) {
          await cloudinary.uploader.destroy(`innovation-hub/events/${publicId}`);
        }
      }
      
      // Upload new image
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'innovation-hub/events',
        resource_type: 'auto',
      });
      updateData.imageUrl = result.secure_url;
    }
    
    // Always update the updatedAt field
    updateData.updatedAt = new Date();
    
    // Update the event
    await event.update(updateData);
    
    res.status(200).json({
      status: 'success',
      message: 'Event updated successfully',
      data: {
        event,
      },
    });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while updating the event',
    });
  }
};

// Delete an event (Admin only)
export const deleteEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUser = req.user as { id: string; role: string };
    
    // Check if user is an admin
    if (currentUser.role !== 'Admin') {
      res.status(403).json({
        status: 'fail',
        message: 'Only administrators can delete events',
      });
      return;
    }
    
    // Find the event
    const event = await Event.findByPk(id);
    
    if (!event) {
      res.status(404).json({
        status: 'fail',
        message: 'Event not found',
      });
      return;
    }
    
    // Delete associated image if exists
    if (event.imageUrl) {
      const publicId = event.imageUrl.split('/').pop()?.split('.')[0];
      if (publicId) {
        await cloudinary.uploader.destroy(`innovation-hub/events/${publicId}`);
      }
    }
    
    // Delete related attendances first
    await Attendance.destroy({
      where: { eventId: id }
    });
    
    // Delete the event
    await event.destroy();
    
    res.status(200).json({
      status: 'success',
      message: 'Event deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while deleting the event',
    });
  }
};

// Get attendees for an event (Admin only)
export const getEventAttendees = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUser = req.user as { id: string; role: string };
    
    // Check if user is an admin
    if (currentUser.role !== 'Admin') {
      res.status(403).json({
        status: 'fail',
        message: 'Only administrators can view event attendees',
      });
      return;
    }
    
    // Check if event exists
    const event = await Event.findByPk(id);
    if (!event) {
      res.status(404).json({
        status: 'fail',
        message: 'Event not found',
      });
      return;
    }
    
    // Support for pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    
    // Support for filtering by status
    const status = req.query.status as 'going' | 'attended' | 'cancelled' | undefined;
    let whereClause: any = { eventId: id };
    if (status) {
      whereClause.status = status;
    }
    
    // Get attendees
    const { count, rows: attendances } = await Attendance.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      include: [
        {
          model: User,
          as: 'attendee',
          attributes: ['id', 'firstName', 'lastName', 'email', 'image']
        }
      ]
    });
    
    // Calculate total pages
    const totalPages = Math.ceil(count / limit);
    
    res.status(200).json({
      status: 'success',
      results: attendances.length,
      totalItems: count,
      totalPages,
      currentPage: page,
      data: {
        attendances,
      },
    });
  } catch (error) {
    console.error('Error fetching event attendees:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching event attendees',
    });
  }
};