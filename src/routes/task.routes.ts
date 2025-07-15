import { Router } from 'express'
import {
  createTask,
  getAllTasks,
  getAssignedTasks,
  getTaskById,
  updateTask,
  deleteTask,
  assignTask
} from '../controllers/taskController.controller' // <-- make sure this path matches your file!
import { protectRoute, restrictTo } from '../middlewares/auth.middleware'

const router = Router()

router.use(protectRoute)

router.post('/', restrictTo('Admin'), createTask)
router.get('/', restrictTo('Admin'), getAllTasks)
router.patch('/:id', restrictTo('Admin'), updateTask)
router.delete('/:id', restrictTo('Admin'), deleteTask)
router.patch('/:id/assign', restrictTo('Admin'), assignTask)
router.get('/assigned', restrictTo('Member'), getAssignedTasks)
router.get('/:id', getTaskById)

export default router