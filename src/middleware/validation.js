import Joi from 'joi';

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }
    next();
  };
};

const registrationSchema = Joi.object({
  facultyId: Joi.string().required().messages({
    'string.empty': 'Faculty selection is required',
    'any.required': 'Faculty selection is required'
  }),
  username: Joi.string().min(3).max(20).required().messages({
    'string.min': 'Username must be at least 3 characters',
    'string.max': 'Username cannot exceed 20 characters',
    'any.required': 'Username is required'
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters',
    'any.required': 'Password is required'
  }),
  personalInfo: Joi.object({
    skills: Joi.array().items(Joi.string()),
    experience: Joi.string().allow(''),
    bio: Joi.string().max(500).allow(''),
    avatar: Joi.string().allow('')
  }).optional(),
  step: Joi.number().min(1).max(4).optional()
});

const loginSchema = Joi.object({
  username: Joi.string().required().messages({
    'any.required': 'Username is required'
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required'
  })
});

export const validateRegistration = validateRequest(registrationSchema);
export const validateLogin = validateRequest(loginSchema);