const { body, query, param, validationResult } = require('express-validator');

// Common sanitization rules
const sanitizeString = (field) => {
  return body(field)
    .trim()
    .escape()
    .isLength({ min: 1 })
    .withMessage(`${field} is required`);
};

const sanitizeEmail = () => {
  return body('email')
    .trim()
    .normalizeEmail()
    .isEmail()
    .withMessage('Invalid email address');
};

const sanitizePassword = () => {
  return body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long');
};

const sanitizeNumber = (field) => {
  return body(field)
    .isNumeric()
    .withMessage(`${field} must be a number`)
    .toFloat();
};

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(403).json({
      error: 'Validation Error',
      details: errors.array()
    });
  }
  next();
};

// Product validation rules
const productValidationRules = [
  sanitizeString('name'),
  sanitizeString('description'),
  sanitizeNumber('price'),
  sanitizeNumber('quantity'),
  sanitizeString('category'),
  validate
];

// Product update validation rules
const productUpdateValidationRules = [
  body('name').optional().trim().escape(),
  body('description').optional().trim().escape(),
  body('price').optional().isNumeric().toFloat(),
  body('quantity').optional().isNumeric().toInt(),
  body('category').optional().trim().escape(),
  validate
];

// User validation rules
const userValidationRules = [
  sanitizeString('name'),
  sanitizeEmail(),
  sanitizePassword(),
  sanitizeString('phone').optional(),
  validate
];

// Order validation rules
const orderValidationRules = [
  sanitizeString('status'),
  sanitizeNumber('total'),
  validate
];

module.exports = {
  sanitizeString,
  sanitizeEmail,
  sanitizePassword,
  sanitizeNumber,
  validate,
  productValidationRules,
  productUpdateValidationRules,
  userValidationRules,
  orderValidationRules
}; 