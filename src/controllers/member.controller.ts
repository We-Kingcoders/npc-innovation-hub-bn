import { Request, Response } from 'express';
import Member from '../models/member.model';
import User from '../models/user.model';
import cloudinary from "../utils/cloudinary.utils";

// Get all members (public) - simplified for card display
export const getAllMembers = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const offset = (page - 1) * limit;

    const { count, rows: users } = await User.findAndCountAll({
      where: { 
        role: 'Member',
        verified: true,
        isActive: true
      },
      attributes: ['id', 'firstName', 'lastName', 'email'],
      limit,
      offset,
      order: [['firstName', 'ASC']]
    });

    const memberPromises = users.map(async (user) => {
      const member = await Member.findOne({
        where: { userId: user.id },
        attributes: ['id', 'userId', 'name', 'role', 'imageUrl']
      });

      if (member) {
        return {
          id: member.id,
          userId: member.userId,
          name: member.name,
          role: member.role,
          imageUrl: member.imageUrl
        };
      } else {
        return {
          id: user.id,
          userId: user.id,
          name: `${user.firstName} ${user.lastName}`,
          role: 'Member',
          imageUrl: '/members-images/member-demo.jpg'
        };
      }
    });

    const members = await Promise.all(memberPromises);
    const totalPages = Math.ceil(count / limit);

    res.status(200).json({
      status: 'success',
      results: members.length,
      totalItems: count,
      totalPages,
      currentPage: page,
      data: {
        members,
      },
    });
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching members',
    });
  }
};

// Get member by member table PK (id)
export const getMemberById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const member = await Member.findByPk(id, {
      include: [{
        model: User,
        attributes: ['email']
      }]
    });

    if (!member) {
      res.status(404).json({
        status: 'fail',
        message: 'Member not found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: {
        member: {
          ...member.toJSON(),
          userId: member.userId
        }
      },
    });
  } catch (error) {
    console.error('Error fetching member:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching member details',
    });
  }
};

// Get member by userId param (public)
export const getMemberInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    if (!userId) {
      res.status(400).json({ status: 'fail', message: 'userId is required in params.' });
      return;
    }
    const member = await Member.findOne({ where: { userId } });
    if (!member) {
      res.status(404).json({
        status: 'fail',
        message: 'Member information not found. Please create your information first.',
      });
      return;
    }
    res.status(200).json({
      status: 'success',
      data: { member: { ...member.toJSON(), userId: member.userId } }
    });
  } catch (error) {
    console.error('Error fetching member information:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching member information',
    });
  }
};

// Create or update member information (POST, PATCH, PUT) using userId param
export const createOrUpdateMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId;
    if (!userId) {
      res.status(400).json({ status: 'fail', message: 'userId is required in params.' });
      return;
    }

    const updateData: any = {};
    if ('name' in req.body) updateData.name = req.body.name;
    if ('role' in req.body) updateData.role = req.body.role;
    if ('bio' in req.body) updateData.bio = req.body.bio;

    let member = await Member.findOne({ where: { userId } });

    if (req.file) {
      if (member?.imageUrl && !member.imageUrl.includes('member-demo.jpg')) {
        const publicId = member.imageUrl.split('/').pop()?.split('.')[0];
        if (publicId) {
          await cloudinary.uploader.destroy(`innovation-hub/members/${publicId}`);
        }
      }
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'innovation-hub/members',
        resource_type: 'auto',
      });
      updateData.imageUrl = result.secure_url;
    }

    if (member) {
      updateData.updatedAt = new Date();
      await member.update(updateData);

      res.status(200).json({
        status: 'success',
        message: 'Member information updated successfully',
        data: {
          member: {
            ...member.toJSON(),
            userId: member.userId
          }
        },
      });
    } else {
      const { name, role } = req.body;
      if (!name) {
        res.status(400).json({
          status: 'fail',
          message: 'Name is required when creating a new member profile',
        });
        return;
      }

      member = await Member.create({
        userId,
        name,
        role: role || 'Member',
        bio: req.body.bio || '',
        imageUrl: updateData.imageUrl || '/members-images/member-demo.jpg',
        skills: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      res.status(201).json({
        status: 'success',
        message: 'Member information created successfully',
        data: {
          member: {
            ...member.toJSON(),
            userId: member.userId
          }
        },
      });
    }
  } catch (error) {
    console.error('Error creating/updating member information:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while saving member information',
    });
  }
};

// Create or update contact information (using userId param)
export const createOrUpdateContacts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    if (!userId) {
      res.status(400).json({ status: 'fail', message: 'userId is required in params.' });
      return;
    }
    let member = await Member.findOne({ where: { userId } });
    const contacts: any = member?.contacts || {};

    if ('linkedin' in req.body) contacts.linkedin = req.body.linkedin;
    if ('github' in req.body) contacts.github = req.body.github;
    if ('twitter' in req.body) contacts.twitter = req.body.twitter;
    if ('telegram' in req.body) contacts.telegram = req.body.telegram;

    if (member) {
      await member.update({
        contacts,
        updatedAt: new Date(),
      });
      res.status(200).json({
        status: 'success',
        message: 'Contact information updated successfully',
        data: { contacts, userId: member.userId }
      });
    } else {
      member = await Member.create({
        userId,
        name: req.body.name || `User${userId.substr(0, 5)}`,
        role: req.body.role || 'Member',
        bio: req.body.bio || '',
        imageUrl: '/members-images/member-demo.jpg',
        skills: [],
        contacts,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      res.status(201).json({
        status: 'success',
        message: 'Member profile with contacts created',
        data: { contacts, userId: member.userId }
      });
    }
  } catch (error) {
    console.error('Error updating contact information:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while updating contact information',
    });
  }
};

// Create or update education information (using userId param)
export const createOrUpdateEducation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    if (!userId) {
      res.status(400).json({ status: 'fail', message: 'userId is required in params.' });
      return;
    }
    let member = await Member.findOne({ where: { userId } });
    let education: any = member?.education || {};

    if ('degree' in req.body) education.degree = req.body.degree;
    if ('institution' in req.body) education.institution = req.body.institution;
    if ('description' in req.body) education.description = req.body.description;

    if (!education.imageUrl) {
      education.imageUrl = '/members-images/university.jpg';
    }
    if (req.file) {
      if (education.imageUrl && !education.imageUrl.includes('university.jpg')) {
        const publicId = education.imageUrl.split('/').pop()?.split('.')[0];
        if (publicId) {
          await cloudinary.uploader.destroy(`innovation-hub/education/${publicId}`);
        }
      }
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'innovation-hub/education',
        resource_type: 'auto',
      });
      education.imageUrl = result.secure_url;
    }

    if (member) {
      await member.update({
        education,
        updatedAt: new Date(),
      });
      res.status(200).json({
        status: 'success',
        message: 'Education information updated successfully',
        data: { education, userId: member.userId }
      });
    } else {
      member = await Member.create({
        userId,
        name: req.body.name || `User${userId.substr(0, 5)}`,
        role: req.body.role || 'Member',
        bio: req.body.bio || '',
        imageUrl: '/members-images/member-demo.jpg',
        skills: [],
        education,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      res.status(201).json({
        status: 'success',
        message: 'Member profile with education created',
        data: { education, userId: member.userId }
      });
    }
  } catch (error) {
    console.error('Error updating education information:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while updating education information',
    });
  }
};

// Create or update skills information (using userId param)
export const createOrUpdateSkills = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    if (!userId) {
      res.status(400).json({ status: 'fail', message: 'userId is required in params.' });
      return;
    }
    const { skillDetails } = req.body;
    if (!skillDetails || !Array.isArray(skillDetails)) {
      res.status(400).json({
        status: 'fail',
        message: 'Skills data must be provided as an array',
      });
      return;
    }

    let member = await Member.findOne({ where: { userId } });

    const simpleSkills = skillDetails.reduce((acc: string[], skill) => {
      if (skill.technologies && Array.isArray(skill.technologies)) {
        acc.push(...skill.technologies);
      }
      return acc;
    }, []);

    if (member) {
      await member.update({
        skillDetails,
        skills: [...new Set(simpleSkills)],
        updatedAt: new Date(),
      });
      res.status(200).json({
        status: 'success',
        message: 'Skills updated successfully',
        data: { skillDetails, skills: [...new Set(simpleSkills)], userId: member.userId }
      });
    } else {
      member = await Member.create({
        userId,
        name: req.body.name || `User${userId.substr(0, 5)}`,
        role: req.body.role || 'Member',
        bio: req.body.bio || '',
        imageUrl: '/members-images/member-demo.jpg',
        skillDetails,
        skills: [...new Set(simpleSkills)] as string[],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      res.status(201).json({
        status: 'success',
        message: 'Member profile with skills created',
        data: { skillDetails, skills: [...new Set(simpleSkills)], userId: member.userId }
      });
    }
  } catch (error) {
    console.error('Error updating skills:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while updating skills',
    });
  }
};

// Delete member information (using userId param)
export const deleteMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    if (!userId) {
      res.status(400).json({ status: 'fail', message: 'userId is required in params.' });
      return;
    }
    const member = await Member.findOne({ where: { userId } });
    if (!member) {
      res.status(404).json({
        status: 'fail',
        message: 'Member not found',
      });
      return;
    }
    if (member.imageUrl && !member.imageUrl.includes('member-demo.jpg')) {
      const publicId = member.imageUrl.split('/').pop()?.split('.')[0];
      if (publicId) {
        await cloudinary.uploader.destroy(`innovation-hub/members/${publicId}`);
      }
    }
    if (member.education?.imageUrl && !member.education.imageUrl.includes('university.jpg')) {
      const publicId = member.education.imageUrl.split('/').pop()?.split('.')[0];
      if (publicId) {
        await cloudinary.uploader.destroy(`innovation-hub/education/${publicId}`);
      }
    }
    await member.destroy();
    res.status(200).json({
      status: 'success',
      message: 'Member information deleted successfully',
      userId: member.userId
    });
  } catch (error) {
    console.error('Error deleting member:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while deleting member information',
    });
  }
};