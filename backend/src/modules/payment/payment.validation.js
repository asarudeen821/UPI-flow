import Joi from 'joi';

function validate(schema, property = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(422).json({
        success: false,
        errors: error.details.map((detail) => detail.message),
      });
    }

    req[property] = value;
    next();
  };
}

const upiPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/;

export const validateCreateOrder = validate(
  Joi.object({
    amount: Joi.number().min(1).max(1000000).required(),
    currency: Joi.string().valid('INR').default('INR'),
    userId: Joi.string().allow('', null).optional(),
    recipientName: Joi.string().min(2).max(100).required(),
    upiId: Joi.string().pattern(upiPattern).required(),
    note: Joi.string().max(200).allow('', null).optional(),
  })
);

export const validateConfirmPayment = validate(
  Joi.object({
    paymentId: Joi.string().max(100).optional(),
  })
);

export const validateOrderId = validate(
  Joi.object({
    orderId: Joi.string().required(),
  }),
  'params'
);

export const validateUserId = validate(
  Joi.object({
    userId: Joi.string().required(),
  }),
  'params'
);
