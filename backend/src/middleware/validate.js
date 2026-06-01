const { validationResult, body, param, query } = require('express-validator');
const { error } = require('../utils/apiResponse');

/**
 * Run validation and return errors if any
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return error(res, 'Validation failed', 422, errors.array().map(e => ({
      field: e.path,
      message: e.msg,
    })));
  }
  next();
};

// Auth validators
const registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be 2–50 characters'),
  body('email').trim().isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/\d/).withMessage('Password must contain a number'),
  body('role').optional().isIn(['user', 'admin']).withMessage('Role must be user or admin'),
];

const loginRules = [
  body('email').trim().isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

// Task validators
const createTaskRules = [
  body('title').trim().notEmpty().withMessage('Title is required')
    .isLength({ min: 3, max: 100 }).withMessage('Title must be 3–100 characters'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description max 1000 characters'),
  body('status').optional().isIn(['todo', 'in-progress', 'completed']).withMessage('Invalid status'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority'),
  body('dueDate').optional().isISO8601().withMessage('Invalid date format').toDate(),
  body('tags').optional().isArray({ max: 10 }).withMessage('Max 10 tags'),
];

const updateTaskRules = [
  param('id').isMongoId().withMessage('Invalid task ID'),
  body('title').optional().trim().isLength({ min: 3, max: 100 }).withMessage('Title must be 3–100 characters'),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('status').optional().isIn(['todo', 'in-progress', 'completed']),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  body('dueDate').optional().isISO8601().toDate(),
];

const mongoIdParam = [
  param('id').isMongoId().withMessage('Invalid ID format'),
];

const paginationRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1–100'),
];

module.exports = {
  validate,
  registerRules,
  loginRules,
  createTaskRules,
  updateTaskRules,
  mongoIdParam,
  paginationRules,
};
