import { Request, Response } from 'express';
import Member from '../models/member.model';
import User from '../models/user.model';
import cloudinary from "../utils/cloudinary.utils";

// Get all members (public) - simplified for card display
export const getAllMembers = async (req: Request, res: Response): Promise<void> => {
  try {
    // Support for pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12; // Default to 12 cards per page
    const offset = (page - 1) * limit;
    
    // Find all users with "Member" role
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
    
    // For each user, try to find their member profile
    const memberPromises = users.map(async (user) => {
      const member = await Member.findOne({
        where: { userId: user.id },
        attributes: ['id', 'name', 'role', 'imageUrl']
      });
      
      // Return either existing member data or create a placeholder
      if (member) {
        return {
          id: member.id,
          name: member.name,
          role: member.role,
          imageUrl: member.imageUrl
        };
      } else {
        // Default placeholder for users without member profiles
        return {
          id: user.id, // Use user ID as temporary member ID
          name: `${user.firstName} ${user.lastName}`,
          role: 'Member', // Default role
          imageUrl: '/members-images/member-demo.jpg' // Default image
        };
      }
    });
    
    const members = await Promise.all(memberPromises);
    
    // Calculate total pages
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

// Get member by ID (public)
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
        member,
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

// Create or update member information
export const createOrUpdateMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = req.user as { id: string; role: string };
    const { name, role, bio } = req.body;
    
    // Check if member already exists for this user
    let member = await Member.findOne({
      where: { userId: currentUser.id }
    });
    
    // Handle image upload
    let imageUrl = member?.imageUrl || '/members-images/member-demo.jpg';
    if (req.file) {
      // Delete old image if it exists and isn't the default
      if (member?.imageUrl && !member.imageUrl.includes('member-demo.jpg')) {
        const publicId = member.imageUrl.split('/').pop()?.split('.')[0];
        if (publicId) {
          await cloudinary.uploader.destroy(`innovation-hub/members/${publicId}`);
        }
      }
      
      // Upload new image
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'innovation-hub/members',
        resource_type: 'auto',
      });
      imageUrl = result.secure_url;
    }
    
    if (member) {
      // Update existing member
      await member.update({
        name: name || member.name,
        role: role || member.role,
        bio: bio || member.bio,
        imageUrl,
        updatedAt: new Date(),
      });
      
      res.status(200).json({
        status: 'success',
        message: 'Member information updated successfully',
        data: {
          member,
        },
      });
    } else {
      // Create new member
      member = await Member.create({
        userId: currentUser.id,
        name,
        role,
        bio: bio || '',
        imageUrl,
        skills: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      res.status(201).json({
        status: 'success',
        message: 'Member information created successfully',
        data: {
          member,
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

// Create or update contact information
export const createOrUpdateContacts = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = req.user as { id: string; role: string };
    const { linkedin, github, twitter, telegram } = req.body;
    
    // Find or create member record
    let member = await Member.findOne({
      where: { userId: currentUser.id }
    });
    
    const contacts = {
      linkedin: linkedin || (member?.contacts?.linkedin || ''),
      github: github || (member?.contacts?.github || ''),
      twitter: twitter || (member?.contacts?.twitter || ''),
      telegram: telegram || (member?.contacts?.telegram || '')
    };
    
    if (member) {
      // Update existing member
      await member.update({
        contacts,
        updatedAt: new Date(),
      });
    } else {
      // Create new member with contacts
      member = await Member.create({
        userId: currentUser.id,
        name: req.body.name || `User${currentUser.id.substr(0, 5)}`,
        role: req.body.role || 'Member',
        bio: req.body.bio || '',
        imageUrl: '/members-images/member-demo.jpg',
        skills: [],
        contacts,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    
    const isNew = member.createdAt === member.updatedAt;
    res.status(isNew ? 201 : 200).json({
      status: 'success',
      message: isNew ? 'Member profile with contacts created' : 'Contact information updated successfully',
      data: {
        contacts,
      },
    });
  } catch (error) {
    console.error('Error updating contact information:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while updating contact information',
    });
  }
};

// Create or update education information
export const createOrUpdateEducation = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = req.user as { id: string; role: string };
    const { degree, institution, description } = req.body;
    
    // Find or create member record
    let member = await Member.findOne({
      where: { userId: currentUser.id }
    });
    
    // Initialize education object
    let education = member?.education || {
      degree: degree || '',
      institution: institution || '',
      description: description || '',
      imageUrl: '/members-images/university.jpg'
    };
    
    // Handle education institution image
    let imageUrl = education.imageUrl;
    if (req.file) {
      // Delete old image if it exists and isn't the default
      if (education.imageUrl && !education.imageUrl.includes('university.jpg')) {
        const publicId = education.imageUrl.split('/').pop()?.split('.')[0];
        if (publicId) {
          await cloudinary.uploader.destroy(`innovation-hub/education/${publicId}`);
        }
      }
      
      // Upload new image
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'innovation-hub/education',
        resource_type: 'auto',
      });
      imageUrl = result.secure_url;
    }
    
    // Update education object
    education = {
      degree: degree || education.degree,
      institution: institution || education.institution,
      description: description || education.description,
      imageUrl
    };
    
    if (member) {
      // Update existing member
      await member.update({
        education,
        updatedAt: new Date(),
      });
    } else {
      // Create new member with education
      member = await Member.create({
        userId: currentUser.id,
        name: req.body.name || `User${currentUser.id.substr(0, 5)}`,
        role: req.body.role || 'Member',
        bio: req.body.bio || '',
        imageUrl: '/members-images/member-demo.jpg',
        skills: [],
        education,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    
    const isNew = member.createdAt === member.updatedAt;
    res.status(isNew ? 201 : 200).json({
      status: 'success',
      message: isNew ? 'Member profile with education created' : 'Education information updated successfully',
      data: {
        education,
      },
    });
  } catch (error) {
    console.error('Error updating education information:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while updating education information',
    });
  }
};

// Create or update skills information
export const createOrUpdateSkills = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = req.user as { id: string; role: string };
    const { skillDetails } = req.body;
    
    if (!skillDetails || !Array.isArray(skillDetails)) {
      res.status(400).json({
        status: 'fail',
        message: 'Skills data must be provided as an array',
      });
      return;
    }
    
    // Find or create member record
    let member = await Member.findOne({
      where: { userId: currentUser.id }
    });
    
    // Extract simple skills from complex skill objects
    const simpleSkills = skillDetails.reduce((acc: string[], skill) => {
      if (skill.technologies && Array.isArray(skill.technologies)) {
        acc.push(...skill.technologies);
      }
      return acc;
    }, []);
    
    if (member) {
      // Update existing member
      await member.update({
        skillDetails,
        skills: [...new Set(simpleSkills)], // Remove duplicates
        updatedAt: new Date(),
      });
    } else {
      // Create new member with skills
      member = await Member.create({
        userId: currentUser.id,
        name: req.body.name || `User${currentUser.id.substr(0, 5)}`,
        role: req.body.role || 'Member',
        bio: req.body.bio || '',
        imageUrl: '/members-images/member-demo.jpg',
        skillDetails,
        skills: [...new Set(simpleSkills)] as string[],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    
    const isNew = member.createdAt === member.updatedAt;
    res.status(isNew ? 201 : 200).json({
      status: 'success',
      message: isNew ? 'Member profile with skills created' : 'Skills updated successfully',
      data: {
        skillDetails,
        skills: [...new Set(simpleSkills)]
      },
    });
  } catch (error) {
    console.error('Error updating skills:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while updating skills',
    });
  }
};

// Delete member information
export const deleteMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = req.user as { id: string; role: string };
    
    const member = await Member.findOne({
      where: { userId: currentUser.id }
    });
    
    if (!member) {
      res.status(404).json({
        status: 'fail',
        message: 'Member not found',
      });
      return;
    }
    
    // Delete profile image if it's not the default
    if (member.imageUrl && !member.imageUrl.includes('member-demo.jpg')) {
      const publicId = member.imageUrl.split('/').pop()?.split('.')[0];
      if (publicId) {
        await cloudinary.uploader.destroy(`innovation-hub/members/${publicId}`);
      }
    }
    
    // Delete education image if it's not the default
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
    });
  } catch (error) {
    console.error('Error deleting member:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while deleting member information',
    });
  }
};

// Get my member information
export const getMyInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = req.user as { id: string; role: string };
    
    const member = await Member.findOne({
      where: { userId: currentUser.id }
    });
    
    if (!member) {
      res.status(404).json({
        status: 'fail',
        message: 'Member information not found. Please create your information first.',
      });
      return;
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        member,
      },
    });
  } catch (error) {
    console.error('Error fetching member information:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching your information',
    });
  }
};

// Import from mock data (Admin only)
export const importFromMockData = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = req.user as { id: string; role: string };
    
    if (!currentUser || currentUser.role !== 'Admin') {
      res.status(403).json({
        status: 'fail',
        message: 'Access denied. Admin privileges required.',
      });
      return;
    }
    
    const { members } = req.body;
    
    if (!Array.isArray(members)) {
      res.status(400).json({
        status: 'fail',
        message: 'Members data must be provided as an array',
      });
      return;
    }
    
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };
    
    for (const mockMember of members) {
      try {
        // Create a basic user if not exists
        const [user, created] = await User.findOrCreate({
          where: { email: `${mockMember.id}@example.com` },
          defaults: {
            email: `${mockMember.id}@example.com`,
            password: 'temppassword', // This should be changed on first login
            role: 'Member',
            verified: true,
            isActive: true
          }
        });
        
        // Extract simple skills from complex skill objects
        const simpleSkills = mockMember.skills.reduce((acc: string[], skill: any) => {
          if (skill.technologies && Array.isArray(skill.technologies)) {
            acc.push(...skill.technologies);
          }
          return acc;
        }, []);
        
        // Create or update member
        await Member.upsert({
          userId: user.id,
          name: mockMember.name,
          role: mockMember.role,
          bio: mockMember.bio,
          imageUrl: mockMember.imageUrl,
          education: mockMember.education,
          contacts: mockMember.contacts,
          skillDetails: mockMember.skills,
          skills: [...new Set(simpleSkills)] as string[],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Error processing ${mockMember.name}: ${error.message}`);
      }
    }
    
    res.status(200).json({
      status: 'success',
      message: `Imported ${results.success} members successfully with ${results.failed} failures`,
      data: results
    });
  } catch (error) {
    console.error('Error importing from mock data:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred during import',
    });
  }
};