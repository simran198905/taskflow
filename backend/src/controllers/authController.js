const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { success, created, error } = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * Generate JWT token
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

/**
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return error(res, 'Email already registered.', 409);
    }

    // Only allow admin creation if explicitly setting role (can be locked down further)
    const userRole = role === 'admin' ? 'admin' : 'user';

    const user = await User.create({ name, email, password, role: userRole });
    const token = generateToken(user._id);

    logger.info(`New user registered: ${email} (${userRole})`);

    return created(res, { token, user }, 'Registration successful');
  } catch (err) {
    logger.error(`Register error: ${err.message}`);
    return error(res, err.message);
  }
};

/**
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user || !user.isActive) {
      return error(res, 'Invalid credentials.', 401);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return error(res, 'Invalid credentials.', 401);
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);
    const userObj = user.toJSON();

    logger.info(`User logged in: ${email}`);

    return success(res, { token, user: userObj }, 'Login successful');
  } catch (err) {
    logger.error(`Login error: ${err.message}`);
    return error(res, err.message);
  }
};

/**
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    return success(res, { user });
  } catch (err) {
    return error(res, err.message);
  }
};

/**
 * @route   PUT /api/v1/auth/me
 * @access  Private
 */
const updateProfile = async (req, res) => {
  try {
    const { name } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name },
      { new: true, runValidators: true }
    );
    return success(res, { user }, 'Profile updated');
  } catch (err) {
    return error(res, err.message);
  }
};

module.exports = { register, login, getMe, updateProfile };
