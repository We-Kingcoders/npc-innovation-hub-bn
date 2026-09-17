import { Request, Response } from 'express'
import Task from '../models/task.model'
import User from '../models/user.model'
import { sendEmail } from '../utils/email.utils'
import { renderBrandedEmail } from '../utils/emailTemplate.utils'

// The same "you've been assigned a task" notification, sent from three
// separate places below (creation with an assignee, reassignment on
// update, and the dedicated assign endpoint) - was three copies of the
// same hand-rolled HTML, none matching the app's own navy brand.
function buildTaskAssignedEmail(
  assigneeFirstName: string,
  taskTitle: string,
  taskDescription: string,
  dueDate: string,
  priority: string,
): { subject: string; text: string; html: string } {
  const subject = 'You have been assigned a new task'
  const text = `Hello ${assigneeFirstName},

You have been assigned a new task: "${taskTitle}".

Description: ${taskDescription}

Due Date: ${dueDate}
Priority: ${priority}

Please check your dashboard for more details.

- Innovation Hub Team`
  const html = renderBrandedEmail({
    previewText: `You've been assigned: ${taskTitle}`,
    heading: "You Have a New Task!",
    bodyHtml: `
      <p>Hello ${assigneeFirstName},</p>
      <p>You have been assigned a new task: <strong>${taskTitle}</strong>.</p>
      <div style="background-color: #f4f7fc; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 8px;"><strong>Description:</strong> ${taskDescription}</p>
        <p style="margin: 0 0 8px;"><strong>Due Date:</strong> ${dueDate}</p>
        <p style="margin: 0;"><strong>Priority:</strong> ${priority}</p>
      </div>
      <p>Please check your dashboard for more details.</p>
      <p>&mdash; Innovation Hub Team</p>
    `,
  })
  return { subject, text, html }
}

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
      const { subject, text, html } = buildTaskAssignedEmail(
        assigneeUser.firstName,
        title,
        description,
        dueDate,
        priority,
      )
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
  } catch {
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
  } catch {
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
  } catch {
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
      const { subject, text, html } = buildTaskAssignedEmail(
        assigneeUser.firstName,
        task.title,
        task.description,
        String(task.dueDate),
        task.priority,
      )
      await sendEmail(assigneeUser.email, subject, text, html)
    }

    res.json(task)
  } catch {
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
  } catch {
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
    const { subject, text, html } = buildTaskAssignedEmail(
      user.firstName,
      task.title,
      task.description,
      String(task.dueDate),
      task.priority,
    )

    await sendEmail(user.email, subject, text, html)

    res.json(task)
  } catch {
    res.status(500).json({ message: 'Failed to assign task.' })
  }
}