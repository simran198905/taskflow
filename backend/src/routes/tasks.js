const express = require('express');
const router = express.Router();
const {
  getTasks, createTask, getTask, updateTask, deleteTask,
  getAllUsers, deleteUser, getStats,
} = require('../controllers/taskController');
const { authenticate, authorize } = require('../middleware/auth');
const {
  createTaskRules, updateTaskRules, mongoIdParam, paginationRules, validate,
} = require('../middleware/validate');

/**
 * @swagger
 * tags:
 *   - name: Tasks
 *     description: Task CRUD operations
 *   - name: Admin
 *     description: Admin-only endpoints
 */

/**
 * @swagger
 * /tasks:
 *   get:
 *     summary: Get all tasks (own tasks; admin sees all)
 *     tags: [Tasks]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [todo, in-progress, completed] }
 *       - in: query
 *         name: priority
 *         schema: { type: string, enum: [low, medium, high] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated task list
 */
router.get('/', authenticate, paginationRules, validate, getTasks);

/**
 * @swagger
 * /tasks:
 *   post:
 *     summary: Create a new task
 *     tags: [Tasks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               status: { type: string, enum: [todo, in-progress, completed] }
 *               priority: { type: string, enum: [low, medium, high] }
 *               dueDate: { type: string, format: date }
 *               tags: { type: array, items: { type: string } }
 *     responses:
 *       201:
 *         description: Task created
 */
router.post('/', authenticate, createTaskRules, validate, createTask);

/**
 * @swagger
 * /tasks/{id}:
 *   get:
 *     summary: Get task by ID
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Task found
 *       404:
 *         description: Not found
 */
router.get('/:id', authenticate, mongoIdParam, validate, getTask);

/**
 * @swagger
 * /tasks/{id}:
 *   put:
 *     summary: Update a task
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Task'
 *     responses:
 *       200:
 *         description: Task updated
 */
router.put('/:id', authenticate, updateTaskRules, validate, updateTask);

/**
 * @swagger
 * /tasks/{id}:
 *   delete:
 *     summary: Delete a task
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Task deleted
 */
router.delete('/:id', authenticate, mongoIdParam, validate, deleteTask);

// ─── Admin routes ─────────────────────────────────────────────────────────────

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Get all users (admin only)
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Paginated user list
 *       403:
 *         description: Forbidden
 */
router.get('/admin/users', authenticate, authorize('admin'), paginationRules, validate, getAllUsers);

/**
 * @swagger
 * /admin/users/{id}:
 *   delete:
 *     summary: Delete a user and their tasks (admin only)
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User deleted
 */
router.delete('/admin/users/:id', authenticate, authorize('admin'), mongoIdParam, validate, deleteUser);

/**
 * @swagger
 * /admin/stats:
 *   get:
 *     summary: Get platform statistics (admin only)
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Stats data
 */
router.get('/admin/stats', authenticate, authorize('admin'), getStats);

module.exports = router;
