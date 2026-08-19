import { Request, Response } from 'express';
import fs from 'fs';
import Member from '../models/member.model';
import User from '../models/user.model';
import cloudinary from "../utils/cloudinary.utils";

// Contacts are allow-listed too: instagram replaced telegram as the accepted
// key, but old rows saved before this change may still hold a `telegram`
// value in their JSONB blob (nothing was backfilled). Filtering here, rather
// than passing `contacts` straight through, guarantees a legacy telegram
// value is never surfaced by the public endpoints even though it isn't
// deleted from storage.
function toPublicContacts(contacts: Member['contacts']) {
  if (!contacts) return contacts;
  const { linkedin, github, twitter, instagram, portfolio } = contacts;
  return { linkedin, github, twitter, instagram, portfolio };
}

const SKILL_CATEGORY_ORDER = [
  'Frontend Development',
  'Backend Development',
  'DevOps & Tools',
  'Mobile & Other',
  'Other',
] as const;

// Groups skillDetails by category and computes each category's overall
// percentage server-side (average of its skills, rounded to the nearest
// whole number) so it can never drift out of sync with the individual
// skills - the frontend doesn't do this grouping/math itself. skillDetails
// itself is left unchanged in the response for backward compatibility with
// existing consumers of the flat list.
function toSkillCategories(skillDetails: Member['skillDetails']) {
  if (!skillDetails || skillDetails.length === 0) return [];

  const byCategory = new Map<string, NonNullable<Member['skillDetails']>>();
  for (const skill of skillDetails) {
    const category = skill.category ?? 'Other';
    if (!byCategory.has(category)) byCategory.set(category, []);
    byCategory.get(category)!.push(skill);
  }

  return SKILL_CATEGORY_ORDER.filter((category) => byCategory.has(category)).map((category) => {
    const skills = byCategory.get(category)!;
    const overall = Math.round(skills.reduce((sum, skill) => sum + skill.percent, 0) / skills.length);
    return { category, overall, skills };
  });
}

// Explicit allow-list for public/unauthenticated member responses.
// Email, phone, and WhatsApp must NEVER appear here, even if such a field is
// added to the Member model later - add new safe fields individually, don't spread.
// languages/cvUrl/tagline/availability may be NULL on rows created before these
// columns existed (no backfill was run), so default them here rather than
// trusting the DB defaultValue, which only applies to new inserts.
function toPublicMemberProfile(member: Member) {
  const {
    id,
    userId,
    name,
    role,
    imageUrl,
    bio,
    education,
    contacts,
    skillDetails,
    skills,
    languages,
    cvUrl,
    resumeUrl,
    tagline,
    hashtags,
    availability,
    createdAt,
    updatedAt,
  } = member;

  return {
    id,
    userId,
    name,
    role,
    imageUrl,
    bio,
    education,
    contacts: toPublicContacts(contacts),
    skillDetails,
    skillCategories: toSkillCategories(skillDetails),
    skills,
    languages: languages ?? [],
    cvUrl: cvUrl ?? null,
    resumeUrl: resumeUrl ?? null,
    tagline: tagline ?? null,
    hashtags: hashtags ?? [],
    availability: availability ?? true,
    createdAt,
    updatedAt,
  };
}

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
          role: 'Other',
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

// Get member by member table PK (id) - public, safe fields only
export const getMemberById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const member = await Member.findByPk(id);

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
        member: toPublicMemberProfile(member),
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

// Get member by userId param (public) - safe fields only
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
      data: { member: toPublicMemberProfile(member) }
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
    // tagline/availability/languages arrive already validated and normalized
    // by validateMemberUpdateBody (JSON-parsed languages, coerced boolean).
    if ('tagline' in req.body) updateData.tagline = req.body.tagline;
    if ('availability' in req.body) updateData.availability = req.body.availability;
    if ('languages' in req.body) updateData.languages = req.body.languages;
    if ('hashtags' in req.body) updateData.hashtags = req.body.hashtags;

    let member = await Member.findOne({ where: { userId } });

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const imageFile = files?.image?.[0];
    const cvFile = files?.cv?.[0];
    const resumeFile = files?.resume?.[0];

    if (imageFile) {
      if (member?.imageUrl && !member.imageUrl.includes('member-demo.jpg')) {
        const publicId = member.imageUrl.split('/').pop()?.split('.')[0];
        if (publicId) {
          await cloudinary.uploader.destroy(`innovation-hub/members/${publicId}`);
        }
      }
      const result = await cloudinary.uploader.upload(imageFile.path, {
        folder: 'innovation-hub/members',
        resource_type: 'auto',
      });
      updateData.imageUrl = result.secure_url;
    }

    if (cvFile) {
      if (member?.cvUrl) {
        const publicId = member.cvUrl.split('/').pop()?.split('.')[0];
        if (publicId) {
          await cloudinary.uploader.destroy(`innovation-hub/members/cv/${publicId}`, { resource_type: 'raw' });
        }
      }
      const result = await cloudinary.uploader.upload(cvFile.path, {
        folder: 'innovation-hub/members/cv',
        resource_type: 'raw',
      });
      updateData.cvUrl = result.secure_url;
      fs.unlinkSync(cvFile.path);
    }

    if (resumeFile) {
      if (member?.resumeUrl) {
        const publicId = member.resumeUrl.split('/').pop()?.split('.')[0];
        if (publicId) {
          await cloudinary.uploader.destroy(`innovation-hub/members/resume/${publicId}`, { resource_type: 'raw' });
        }
      }
      const result = await cloudinary.uploader.upload(resumeFile.path, {
        folder: 'innovation-hub/members/resume',
        resource_type: 'raw',
      });
      updateData.resumeUrl = result.secure_url;
      fs.unlinkSync(resumeFile.path);
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
        role: role || 'Other',
        bio: req.body.bio || '',
        imageUrl: updateData.imageUrl || '/members-images/member-demo.jpg',
        skills: [],
        languages: updateData.languages || [],
        hashtags: updateData.hashtags || [],
        cvUrl: updateData.cvUrl || null,
        resumeUrl: updateData.resumeUrl || null,
        tagline: updateData.tagline ?? null,
        availability: 'availability' in updateData ? updateData.availability : true,
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
    if ('instagram' in req.body) contacts.instagram = req.body.instagram;
    if ('portfolio' in req.body) contacts.portfolio = req.body.portfolio;

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
        role: req.body.role || 'Other',
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
    if ('department' in req.body) education.department = req.body.department;
    if ('description' in req.body) education.description = req.body.description;
    // startYear/endYear/status arrive already validated by
    // validateEducationUpdateBody (endYear may be explicitly null, meaning
    // "Present" - `in` catches that case, an `||`/`??` fallback would not).
    if ('startYear' in req.body) education.startYear = req.body.startYear;
    if ('endYear' in req.body) education.endYear = req.body.endYear;
    if ('status' in req.body) education.status = req.body.status;

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
        role: req.body.role || 'Other',
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
        role: req.body.role || 'Other',
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