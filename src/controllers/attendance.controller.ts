import { Request, Response } from 'express';
import Attendance from '../models/attendance.model';
import Event from '../models/event.model';
import User from '../models/user.model';
import { Op } from 'sequelize';


// RSVP to an event
export const rsvpToEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const currentUser = req.user as { id: string; role: string };
    
    // Check if event exists
    const event = await Event.findByPk(eventId);
    if (!event) {
      res.status(404).json({
        status: 'fail',
        message: 'Event not found',
      });
      return;
    }
    
    // Check if the event has already ended
    if (new Date(event.endTime) < new Date()) {
      res.status(400).json({
        status: 'fail',
        message: 'Cannot RSVP to past events',
      });
      return;
    }
    
    // Check if user already RSVPed
    const existingAttendance = await Attendance.findOne({
      where: {
        userId: currentUser.id,
        eventId
      }
    });
    
    if (existingAttendance) {
      // If previously cancelled, update to going
      if (existingAttendance.status === 'cancelled') {
        await existingAttendance.update({
          status: 'going',
          updatedAt: new Date()
        });
        
        res.status(200).json({
          status: 'success',
          message: 'RSVP updated successfully',
          data: {
            attendance: existingAttendance,
          },
        });
      } else {
        res.status(400).json({
          status: 'fail',
          message: 'You have already RSVPed to this event',
        });
      }
      return;
    }
    
    // Create new attendance record
    const attendance = await Attendance.create({
      userId: currentUser.id,
      eventId,
      status: 'going'
    });
    
    res.status(201).json({
      status: 'success',
      message: 'RSVP successful',
      data: {
        attendance,
      },
    });
  } catch (error) {
    console.error('Error RSVPing to event:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while RSVPing to the event',
    });
  }
};

// Cancel RSVP to an event
export const cancelRsvp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const currentUser = req.user as { id: string; role: string };
    
    // Check if event exists
    const event = await Event.findByPk(eventId);
    if (!event) {
      res.status(404).json({
        status: 'fail',
        message: 'Event not found',
      });
      return;
    }
    
    // Find attendance record
    const attendance = await Attendance.findOne({
      where: {
        userId: currentUser.id,
        eventId
      }
    });
    
    if (!attendance) {
      res.status(404).json({
        status: 'fail',
        message: 'You have not RSVPed to this event',
      });
      return;
    }
    
    // Update status to cancelled
    await attendance.update({
      status: 'cancelled',
      updatedAt: new Date()
    });
    
    res.status(200).json({
      status: 'success',
      message: 'RSVP cancelled successfully',
      data: {
        attendance,
      },
    });
  } catch (error) {
    console.error('Error cancelling RSVP:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while cancelling your RSVP',
    });
  }
};

// Mark attendance for an event (Admin only)
export const markAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId, userId } = req.params;
    const currentUser = req.user as { id: string; role: string };
    
    // Check if user is an admin
    if (currentUser.role !== 'Admin') {
      res.status(403).json({
        status: 'fail',
        message: 'Only administrators can mark attendance',
      });
      return;
    }
    
    // Check if event exists
    const event = await Event.findByPk(eventId);
    if (!event) {
      res.status(404).json({
        status: 'fail',
        message: 'Event not found',
      });
      return;
    }
    
    // Check if user exists
    const user = await User.findByPk(userId);
    if (!user) {
      res.status(404).json({
        status: 'fail',
        message: 'User not found',
      });
      return;
    }
    
    // Find or create attendance record
    const [attendance, created] = await Attendance.findOrCreate({
      where: {
        userId,
        eventId
      },
      defaults: {
        userId,
        eventId,
        status: 'attended'
      }
    });
    
    if (!created) {
      // Update existing record
      await attendance.update({
        status: 'attended',
        updatedAt: new Date()
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Attendance marked successfully',
      data: {
        attendance,
      },
    });
  } catch (error) {
    console.error('Error marking attendance:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while marking attendance',
    });
  }
};

// Get my events (events I've RSVPed to or attended)
export const getMyEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = req.user as { id: string; role: string };
    
    // Support for pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    
    // Support for filtering by status
    const status = req.query.status as 'going' | 'attended' | 'cancelled' | undefined;
    let whereClause: any = { 
      userId: currentUser.id
    };
    if (status) {
      whereClause.status = status;
    }
    
    // Support for filtering by time
    const filter = req.query.filter as string || 'all'; // 'all', 'upcoming', 'past'
    let eventWhereClause = {};
    const currentDate = new Date();
    
    if (filter === 'upcoming') {
      eventWhereClause = {
        startTime: {
          [Op.gte]: currentDate
        }
      };
    } else if (filter === 'past') {
      eventWhereClause = {
        endTime: {
          [Op.lt]: currentDate
        }
      };
    }
    
    // Get attendances with their events
    const { count, rows: attendances } = await Attendance.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      include: [
        {
          model: Event,
          as: 'event',
          where: eventWhereClause,
          include: [
            {
              model: User,
              as: 'creator',
              attributes: ['id', 'firstName', 'lastName', 'image']
            }
          ]
        }
      ],
      order: [
        [{ model: Event, as: 'event' }, 'startTime', 'ASC']
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
    console.error('Error fetching my events:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching your events',
    });
  }
};

// Check RSVP status for an event
export const checkRsvpStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const currentUser = req.user as { id: string; role: string };
    
    // Check if event exists
    const event = await Event.findByPk(eventId);
    if (!event) {
      res.status(404).json({
        status: 'fail',
        message: 'Event not found',
      });
      return;
    }
    
    // Find attendance record
    const attendance = await Attendance.findOne({
      where: {
        userId: currentUser.id,
        eventId
      }
    });
    
    if (!attendance) {
      res.status(200).json({
        status: 'success',
        data: {
          isRsvped: false,
          status: null
        },
      });
      return;
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        isRsvped: attendance.status !== 'cancelled',
        status: attendance.status
      },
    });
  } catch (error) {
    console.error('Error checking RSVP status:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while checking RSVP status',
    });
  }
};