const Task = require('../models/Task');
const { success, created, error, paginated } = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * @route   GET /api/v1/tasks
 * @access  Private
 */
const getTasks = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, priority, search, sortBy = 'createdAt', order = 'desc' } = req.query;

    const filter = {};

    // Admins see all tasks; regular users see only their own
    if (req.user.role !== 'admin') {
      filter.owner = req.user._id;
    }

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (search) filter.title = { $regex: search, $options: 'i' };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = order === 'asc' ? 1 : -1;

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate('owner', 'name email')
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(parseInt(limit)),
      Task.countDocuments(filter),
    ]);

    return paginated(res, tasks, page, limit, total);
  } catch (err) {
    logger.error(`getTasks error: ${err.message}`);
    return error(res, err.message);
  }
};

/**
 * @route   POST /api/v1/tasks
 * @access  Private
 */
const createTask = async (req, res) => {
  try {
    const task = await Task.create({ ...req.body, owner: req.user._id });
    logger.info(`Task created: ${task._id} by ${req.user.email}`);
    return created(res, { task }, 'Task created successfully');
  } catch (err) {
    logger.error(`createTask error: ${err.message}`);
    return error(res, err.message);
  }
};

/**
 * @route   GET /api/v1/tasks/:id
 * @access  Private
 */
const getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate('owner', 'name email');

    if (!task) return error(res, 'Task not found.', 404);

    // Non-admins can only access their own tasks
    if (req.user.role !== 'admin' && task.owner._id.toString() !== req.user._id.toString()) {
      return error(res, 'Access denied.', 403);
    }

    return success(res, { task });
  } catch (err) {
    return error(res, err.message);
  }
};

/**
 * @route   PUT /api/v1/tasks/:id
 * @access  Private
 */
const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return error(res, 'Task not found.', 404);

    if (req.user.role !== 'admin' && task.owner.toString() !== req.user._id.toString()) {
      return error(res, 'Access denied.', 403);
    }

    const updatedTask = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('owner', 'name email');

    logger.info(`Task updated: ${task._id}`);
    return success(res, { task: updatedTask }, 'Task updated successfully');
  } catch (err) {
    return error(res, err.message);
  }
};

/**
 * @route   DELETE /api/v1/tasks/:id
 * @access  Private
 */
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return error(res, 'Task not found.', 404);

    if (req.user.role !== 'admin' && task.owner.toString() !== req.user._id.toString()) {
      return error(res, 'Access denied.', 403);
    }

    await task.deleteOne();
    logger.info(`Task deleted: ${req.params.id}`);
    return success(res, {}, 'Task deleted successfully');
  } catch (err) {
    return error(res, err.message);
  }
};

// ──────────── ADMIN ONLY ────────────

/**
 * @route   GET /api/v1/admin/users
 * @access  Admin
 */
const getAllUsers = async (req, res) => {
  try {
    const User = require('../models/User');
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      User.find().sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      User.countDocuments(),
    ]);

    return paginated(res, users, page, limit, total);
  } catch (err) {
    return error(res, err.message);
  }
};

/**
 * @route   DELETE /api/v1/admin/users/:id
 * @access  Admin
 */
const deleteUser = async (req, res) => {
  try {
    const User = require('../models/User');
    if (req.params.id === req.user._id.toString()) {
      return error(res, 'Cannot delete your own account.', 400);
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return error(res, 'User not found.', 404);
    await Task.deleteMany({ owner: req.params.id });
    return success(res, {}, 'User and their tasks deleted');
  } catch (err) {
    return error(res, err.message);
  }
};

/**
 * @route   GET /api/v1/admin/stats
 * @access  Admin
 */
const getStats = async (req, res) => {
  try {
    const User = require('../models/User');
    const [userCount, taskCount, tasksByStatus] = await Promise.all([
      User.countDocuments(),
      Task.countDocuments(),
      Task.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    return success(res, { userCount, taskCount, tasksByStatus });
  } catch (err) {
    return error(res, err.message);
  }
};

module.exports = { getTasks, createTask, getTask, updateTask, deleteTask, getAllUsers, deleteUser, getStats };
