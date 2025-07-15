import { Request, Response } from 'express'
import Task from '../models/task.model'
import User from '../models/user.model'
import { sendEmail } from '../utils/email.utils'

/**
 * Create a new task (Admin only)
 */
export async function createTask(req: Request, res: Response): Promise<void> {
  try {
    const {
      title,
      description,
      status = 'pending',
      priority = 'medium',
      githubIssueLink,
      dueDate,
      assignedTo,
    } = req.body

    if (!title || !description || !dueDate) {
      res.status(400).json({ message: 'Title, description, and dueDate are required.' })
      return
    }

    if (!['pending', 'in-progress', 'completed'].includes(status)) {
      res.status(400).json({ message: 'Invalid status value.' })
      return
    }
    if (!['low', 'medium', 'high'].includes(priority)) {
      res.status(400).json({ message: 'Invalid priority value.' })
      return
    }

    let assigneeUser = null
    if (assignedTo) {
      assigneeUser = await User.findOne({ where: { id: assignedTo, role: 'Member' } })
      if (!assigneeUser) {
        res.status(400).json({ message: 'Assigned user does not exist or is not a Member.' })
        return
      }
    }

    const task = await Task.create({
      title,
      description,
      status,
      priority,
      githubIssueLink,
      dueDate,
      createdBy: req.user?.id ?? '',
      assignedTo: assignedTo || null,
    })

    // Notify if assigned on creation
    if (assigneeUser) {
      const subject = 'You have been assigned a new task'
      const text = `Hello ${assigneeUser.firstName},

You have been assigned a new task: "${title}".

Description: ${description}

Due Date: ${dueDate}
Priority: ${priority}

Please check your dashboard for more details.

- Innovation Hub Team`
      const html = `
<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
  <h2 style="color: #2c3e50;">You have been assigned a new task!</h2>
  <p>Hello ${assigneeUser.firstName},</p>
  <p>You have been assigned a new task: <strong>${title}</strong>.</p>
  <p><strong>Description:</strong> ${description}</p>
  <p><strong>Due Date:</strong> ${dueDate}</p>
  <p><strong>Priority:</strong> ${priority}</p>
  <p>Please check your dashboard for more details.</p>
  <p>— Innovation Hub Team</p>
</div>
      `
      await sendEmail(assigneeUser.email, subject, text, html)
    }

    res.status(201).json(task)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Failed to create task.' })
  }
}

/**
 * Get all tasks (Admin only)
 */
export async function getAllTasks(req: Request, res: Response): Promise<void> {
  try {
    const tasks = await Task.findAll({
      include: [
        { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'email', 'role'] },
        { model: User, as: 'assignee', attributes: ['id', 'firstName', 'lastName', 'email', 'role'] },
      ],
      order: [['createdAt', 'DESC']],
    })
    res.json(tasks)
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve tasks.' })
  }
}

/**
 * Get tasks assigned to the logged-in user (Member)
 */
export async function getAssignedTasks(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({ message: 'Unauthorized: User not found.' })
      return
    }
    const tasks = await Task.findAll({
      where: { assignedTo: req.user.id },
      order: [['createdAt', 'DESC']],
    })
    res.json(tasks)
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve assigned tasks.' })
  }
}

/**
 * Get a single task by ID (Admin, or Member if assigned)
 */
export async function getTaskById(req: Request, res: Response): Promise<void> {
  try {
    const task = await Task.findByPk(req.params.id, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'email', 'role'] },
        { model: User, as: 'assignee', attributes: ['id', 'firstName', 'lastName', 'email', 'role'] },
      ],
    })

    if (!task) {
      res.status(404).json({ message: 'Task not found.' })
      return
    }

    // Only allow a Member to view if they are assigned
    if (req.user && req.user.role === 'Member' && task.assignedTo !== req.user.id) {
      res.status(403).json({ message: 'Access denied.' })
      return
    }

    res.json(task)
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve task.' })
  }
}

/**
 * Update a task (Admin only)
 */
export async function updateTask(req: Request, res: Response): Promise<void> {
  try {
    const { title, description, status, priority, githubIssueLink, dueDate, assignedTo } = req.body

    const task = await Task.findByPk(req.params.id)
    if (!task) {
      res.status(404).json({ message: 'Task not found.' })
      return
    }

    let assigneeUser = null
    if (assignedTo) {
      assigneeUser = await User.findOne({ where: { id: assignedTo, role: 'Member' } })
      if (!assigneeUser) {
        res.status(400).json({ message: 'Assigned user does not exist or is not a Member.' })
        return
      }
    }

    if (title !== undefined) task.title = title
    if (description !== undefined) task.description = description
    if (status !== undefined) {
      if (!['pending', 'in-progress', 'completed'].includes(status)) {
        res.status(400).json({ message: 'Invalid status value.' })
        return
      }
      task.status = status
    }
    if (priority !== undefined) {
      if (!['low', 'medium', 'high'].includes(priority)) {
        res.status(400).json({ message: 'Invalid priority value.' })
        return
      }
      task.priority = priority
    }
    if (githubIssueLink !== undefined) task.githubIssueLink = githubIssueLink
    if (dueDate !== undefined) task.dueDate = dueDate
    if (assignedTo !== undefined) task.assignedTo = assignedTo

    await task.save()

    // Notify if reassigned
    if (assigneeUser) {
      const subject = 'You have been assigned a new task'
      const text = `Hello ${assigneeUser.firstName},

You have been assigned a new task: "${task.title}".

Description: ${task.description}

Due Date: ${task.dueDate}
Priority: ${task.priority}

Please check your dashboard for more details.

- Innovation Hub Team`
      const html = `
<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
  <h2 style="color: #2c3e50;">You have been assigned a new task!</h2>
  <p>Hello ${assigneeUser.firstName},</p>
  <p>You have been assigned a new task: <strong>${task.title}</strong>.</p>
  <p><strong>Description:</strong> ${task.description}</p>
  <p><strong>Due Date:</strong> ${task.dueDate}</p>
  <p><strong>Priority:</strong> ${task.priority}</p>
  <p>Please check your dashboard for more details.</p>
  <p>— Innovation Hub Team</p>
</div>
      `
      await sendEmail(assigneeUser.email, subject, text, html)
    }

    res.json(task)
  } catch (error) {
    res.status(500).json({ message: 'Failed to update task.' })
  }
}

/**
 * Delete a task (Admin only)
 */
export async function deleteTask(req: Request, res: Response): Promise<void> {
  try {
    const task = await Task.findByPk(req.params.id)
    if (!task) {
      res.status(404).json({ message: 'Task not found.' })
      return
    }
    await task.destroy()
    res.json({ message: 'Task deleted successfully.' })
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete task.' })
  }
}

/**
 * Assign a task to a member (Admin only)
 * Notifies the user via email upon assignment.
 */
export async function assignTask(req: Request, res: Response): Promise<void> {
  try {
    const { userId, githubIssueLink } = req.body

    // Validate user existence and role
    const user = await User.findOne({ where: { id: userId, role: 'Member' } })
    if (!user) {
      res.status(400).json({ message: 'Assigned user does not exist or is not a Member.' })
      return
    }

    const task = await Task.findByPk(req.params.id)
    if (!task) {
      res.status(404).json({ message: 'Task not found.' })
      return
    }

    task.assignedTo = userId
    if (githubIssueLink) {
      task.githubIssueLink = githubIssueLink
    }
    await task.save()

    // Notify user via email
    const subject = 'You have been assigned a new task'
    const text = `Hello ${user.firstName},

You have been assigned a new task: "${task.title}".

Description: ${task.description}

Due Date: ${task.dueDate}
Priority: ${task.priority}

Please check your dashboard for more details.

- Innovation Hub Team`
    const html = `
<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
  <h2 style="color: #2c3e50;">You have been assigned a new task!</h2>
  <p>Hello ${user.firstName},</p>
  <p>You have been assigned a new task: <strong>${task.title}</strong>.</p>
  <p><strong>Description:</strong> ${task.description}</p>
  <p><strong>Due Date:</strong> ${task.dueDate}</p>
  <p><strong>Priority:</strong> ${task.priority}</p>
  <p>Please check your dashboard for more details.</p>
  <p>— Innovation Hub Team</p>
</div>
    `

    await sendEmail(user.email, subject, text, html)

    res.json(task)
  } catch (error) {
    res.status(500).json({ message: 'Failed to assign task.' })
  }
}