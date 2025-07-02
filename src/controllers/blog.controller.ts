import { Request, Response, NextFunction } from 'express'
import Blog from '../models/blog.model'
import User from '../models/user.model'
import cloudinary from "../utils/cloudinary.utils"
import { Notification, NotificationType } from '../models/notification.modal'

// Helper function to create notifications for all members
const createNotificationsForMembers = async (
  message: string, 
  notificationType: NotificationType, 
  adminId: string
): Promise<void> => {
  try {
    // Get all members
    const members = await User.findAll({
      where: {
        role: 'Member',
        isActive: true,
        verified: true
      }
    });

    // Create notification for each member
    for (const member of members) {
      await Notification.create({
        userId: member.id,
        message: message,
        type: notificationType,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    console.log(`Notifications created for ${members.length} members`);
  } catch (error) {
    console.error('Error creating notifications for members:', error);
  }
};

// Create a new blog (Admin only)
export const createBlog = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = req.user as { id: string; role: string }
    
    // Check if user is admin
    if (!currentUser || currentUser.role !== 'Admin') {
      res.status(403).json({
        status: 'fail',
        message: 'Access denied. Admin privileges required to create blogs.',
      })
      return
    }

    const { title, content, summary, category } = req.body
    
    // Initialize imageUrl as undefined instead of null
    let imageUrl: string | undefined = undefined
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'innovation-hub/blogs',
        resource_type: 'auto',
      })
      imageUrl = result.secure_url
    }

    const blog = await Blog.create({
      title,
      content,
      summary,
      image: imageUrl,
      category,
      authorId: currentUser.id,
    })

    console.log(`Blog created: "${title}" by ${currentUser.id} at ${new Date().toISOString()}`)

    // Create notifications for all members about the new blog
    await createNotificationsForMembers(
      `New blog post: "${title}" has been published in the ${category} category.`,
      NotificationType.INFO,
      currentUser.id
    );

    res.status(201).json({
      status: 'success',
      message: 'Blog created successfully',
      data: {
        blog,
      },
    })
  } catch (error) {
    console.error('Error creating blog:', error)
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while creating the blog',
    })
  }
}

// Get all blogs
export const getAllBlogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const blogs = await Blog.findAll({
      where: { isPublished: true },
      order: [['createdAt', 'DESC']],
    })

    res.status(200).json({
      status: 'success',
      results: blogs.length,
      data: {
        blogs,
      },
    })
  } catch (error) {
    console.error('Error fetching blogs:', error)
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching blogs',
    })
  }
}

// Get blog by ID
export const getBlogById = async (req: Request, res: Response): Promise<void> => {
  try {
    const blogId = req.params.id
    
    const blog = await Blog.findByPk(blogId)
    if (!blog) {
      res.status(404).json({
        status: 'fail',
        message: 'Blog not found',
      })
      return
    }

    // Increment view count
    blog.viewCount = blog.viewCount + 1
    await blog.save()

    res.status(200).json({
      status: 'success',
      data: {
        blog,
      },
    })
  } catch (error) {
    console.error('Error fetching blog:', error)
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching the blog',
    })
  }
}

// Update a blog (Admin only)
export const updateBlog = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = req.user as { id: string; role: string }
    
    // Check if user is admin
    if (!currentUser || currentUser.role !== 'Admin') {
      res.status(403).json({
        status: 'fail',
        message: 'Access denied. Admin privileges required to update blogs.',
      })
      return
    }

    const blogId = req.params.id
    const blog = await Blog.findByPk(blogId)
    
    if (!blog) {
      res.status(404).json({
        status: 'fail',
        message: 'Blog not found',
      })
      return
    }

    const { title, content, summary, category, isPublished } = req.body
    const originalTitle = blog.title
    const wasPublished = blog.isPublished
    
    // Make sure we handle image properly with the correct type
    let imageUrl: string | undefined = blog.image || undefined
    if (req.file) {
      // If there's an existing image, delete it from cloudinary
      if (blog.image) {
        const publicId = blog.image.split('/').pop()?.split('.')[0]
        if (publicId) {
          await cloudinary.uploader.destroy(`innovation-hub/blogs/${publicId}`)
        }
      }
      
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'innovation-hub/blogs',
        resource_type: 'auto',
      })
      imageUrl = result.secure_url
    }

    await blog.update({
      title: title || blog.title,
      content: content || blog.content,
      summary: summary || blog.summary,
      image: imageUrl,
      category: category || blog.category,
      isPublished: isPublished !== undefined ? isPublished : blog.isPublished,
      updatedAt: new Date(),
    })

    console.log(`Blog updated: "${blog.title}" by ${currentUser.id} at ${new Date().toISOString()}`)

    // Check if the blog's published status changed
    let notificationMessage = `The blog "${originalTitle}" has been updated.`;
    
    if (wasPublished !== blog.isPublished) {
      if (blog.isPublished) {
        notificationMessage = `The blog "${blog.title}" has been published.`;
      } else {
        // If unpublished, we might not want to notify members
        notificationMessage = '';
      }
    }

    // Only create notifications if the blog is published or was just updated while being published
    if (blog.isPublished && notificationMessage) {
      await createNotificationsForMembers(
        notificationMessage,
        NotificationType.INFO,
        currentUser.id
      );
    }

    res.status(200).json({
      status: 'success',
      message: 'Blog updated successfully',
      data: {
        blog,
      },
    })
  } catch (error) {
    console.error('Error updating blog:', error)
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while updating the blog',
    })
  }
}

// Delete a blog (Admin only)
export const deleteBlog = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = req.user as { id: string; role: string }
    
    // Check if user is admin
    if (!currentUser || currentUser.role !== 'Admin') {
      res.status(403).json({
        status: 'fail',
        message: 'Access denied. Admin privileges required to delete blogs.',
      })
      return
    }

    const blogId = req.params.id
    const blog = await Blog.findByPk(blogId)
    
    if (!blog) {
      res.status(404).json({
        status: 'fail',
        message: 'Blog not found',
      })
      return
    }

    const blogTitle = blog.title
    const wasPublished = blog.isPublished
    
    // If there's an image, delete it from cloudinary
    if (blog.image) {
      const publicId = blog.image.split('/').pop()?.split('.')[0]
      if (publicId) {
        await cloudinary.uploader.destroy(`innovation-hub/blogs/${publicId}`)
      }
    }

    await blog.destroy()

    console.log(`Blog deleted: "${blogTitle}" by ${currentUser.id} at ${new Date().toISOString()}`)

    // Only notify if the blog was published
    if (wasPublished) {
      await createNotificationsForMembers(
        `The blog "${blogTitle}" has been removed.`,
        NotificationType.INFO,
        currentUser.id
      );
    }

    res.status(200).json({
      status: 'success',
      message: 'Blog deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting blog:', error)
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while deleting the blog',
    })
  }
}

// Get blogs by category
export const getBlogsByCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category } = req.params
    
    const validCategories = ['Cyber security', 'Front-end', 'Back-end']
    if (!validCategories.includes(category)) {
      res.status(400).json({
        status: 'fail',
        message: 'Invalid category. Valid categories are: Cyber security, Front-end, Back-end',
      })
      return
    }

    const blogs = await Blog.findAll({
      where: { 
        category,
        isPublished: true 
      },
      order: [['createdAt', 'DESC']],
    })

    res.status(200).json({
      status: 'success',
      results: blogs.length,
      data: {
        blogs,
      },
    })
  } catch (error) {
    console.error('Error fetching blogs by category:', error)
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching blogs by category',
    })
  }
}

// Toggle blog publication status (Admin only)
export const toggleBlogPublish = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = req.user as { id: string; role: string }
    
    // Check if user is admin
    if (!currentUser || currentUser.role !== 'Admin') {
      res.status(403).json({
        status: 'fail',
        message: 'Access denied. Admin privileges required to change blog publication status.',
      })
      return
    }

    const blogId = req.params.id
    const blog = await Blog.findByPk(blogId)
    
    if (!blog) {
      res.status(404).json({
        status: 'fail',
        message: 'Blog not found',
      })
      return
    }

    const oldStatus = blog.isPublished
    blog.isPublished = !blog.isPublished
    await blog.save()

    const statusMessage = blog.isPublished ? 'published' : 'unpublished'
    console.log(`Blog ${statusMessage}: "${blog.title}" by ${currentUser.id} at ${new Date().toISOString()}`)

    // Only send notification when publishing a blog (not when unpublishing)
    if (blog.isPublished && !oldStatus) {
      await createNotificationsForMembers(
        `A blog titled "${blog.title}" has just been published in the ${blog.category} category.`,
        NotificationType.INFO,
        currentUser.id
      );
    }

    res.status(200).json({
      status: 'success',
      message: `Blog ${statusMessage} successfully`,
      data: {
        blog,
      },
    })
  } catch (error) {
    console.error('Error toggling blog publish status:', error)
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while changing blog publication status',
    })
  }
}

// Get featured blogs (most viewed)
export const getFeaturedBlogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 3
    
    const blogs = await Blog.findAll({
      where: { isPublished: true },
      order: [['viewCount', 'DESC']],
      limit,
    })

    res.status(200).json({
      status: 'success',
      results: blogs.length,
      data: {
        blogs,
      },
    })
  } catch (error) {
    console.error('Error fetching featured blogs:', error)
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching featured blogs',
    })
  }
}

// Get all blogs (Admin only - including unpublished)
export const getAllBlogsAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = req.user as { id: string; role: string }
    
    // Check if user is admin
    if (!currentUser || currentUser.role !== 'Admin') {
      res.status(403).json({
        status: 'fail',
        message: 'Access denied. Admin privileges required.',
      })
      return
    }

    const blogs = await Blog.findAll({
      order: [['createdAt', 'DESC']],
    })

    res.status(200).json({
      status: 'success',
      results: blogs.length,
      data: {
        blogs,
      },
    })
  } catch (error) {
    console.error('Error fetching all blogs for admin:', error)
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching all blogs',
    })
  }
}