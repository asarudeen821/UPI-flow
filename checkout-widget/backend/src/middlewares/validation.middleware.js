/**
 * Validation Middleware
 * Joi-based request validation
 */

import Joi from 'joi';

// Payment creation schema
const paymentSchema = Joi.object({
  publicKey: Joi.string().required().min(10),
  amount: Joi.number().positive().max(1000000).required(),
  currency: Joi.string().length(3).default('INR'),
  gateway: Joi.string().valid('razorpay', 'stripe').default('razorpay'),
  orderId: Joi.string().required(),
  product: Joi.object({
    name: Joi.string().min(2).required(),
    description: Joi.string().max(500)
  }).required(),
  customer: Joi.object({
    name: Joi.string().min(2),
    email: Joi.string().email(),
    phone: Joi.string().pattern(/^[6-9]\d{9}$/)
  }),
  metadata: Joi.object().optional()
});

// Payment verification schema
const verificationSchema = Joi.object({
  paymentId: Joi.string().required(),
  orderId: Joi.string().required(),
  gatewayPaymentId: Joi.string().required(),
  signature: Joi.string().required(),
  amount: Joi.number().positive().required(),
  gateway: Joi.string().valid('razorpay', 'stripe').required()
});

/**
 * Validate payment creation request
 */
export function validatePaymentRequest(req, res, next) {
  const { error, value } = paymentSchema.validate(req.body, { abortEarly: false });
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: error.details.map(d => d.message)
    });
  }
  
  req.body = value;
  next();
}

/**
 * Validate payment verification request
 */
export function validateVerificationRequest(req, res, next) {
  const { error, value } = verificationSchema.validate(req.body, { abortEarly: false });
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: error.details.map(d => d.message)
    });
  }
  
  req.body = value;
  next();
}

export default {
  validatePaymentRequest,
  validateVerificationRequest
};
