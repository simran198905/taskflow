const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { error } = require('../utils/apiResponse');

/**
 * Verify JWT token and attach user to request
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return error(res, 'Access denied. No token provided.', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');
    if (!user || !user.isActive) {
      return error(res, 'User not found or account deactivated.', 401);
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return error(res, 'Token expired. Please login again.', 401);
    }
    if (err.name === 'JsonWebTokenError') {
      return error(res, 'Invalid token.', 401);
    }
    return error(res, 'Authentication failed.', 500);
  }
};

/**
 * Role-based access control
 * @param {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return error(res, 'Not authenticated.', 401);
    }
    if (!roles.includes(req.user.role)) {
      return error(res, `Access denied. Required role: ${roles.join(' or ')}.`, 403);
    }
    next();
  };
};

module.exports = { authenticate, authorize };
