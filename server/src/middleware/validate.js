const { validationResult } = require('express-validator');

/**
 * Middleware to intercept express-validator errors and return
 * a clean, standardized JSON response: { success: false, message, errors }
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error: ' + errors.array().map(e => e.msg).join(', '),
      errors: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg
      }))
    });
  }
  next();
};

module.exports = validate;
