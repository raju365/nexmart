const { body, validationResult } = require("express-validator");

const respondWithValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};
const registerUserValidations = [
  body("username")
    .isString()
    .withMessage("username must be a string")
    .isLength({ min: 3 })
    .withMessage("username must be at least 3 characters long"),

  body("email").isEmail().withMessage("Invalid Email address"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("password must be at least 6 characters long"),
  body("fullName.firstName")
    .isString()
    .withMessage("First name must be a string")
    .notEmpty()
    .withMessage("First name is require"),
  body("fullName.lastName")
    .isString()
    .withMessage("Last name must be a string")
    .notEmpty()
    .withMessage("Last name is require"),
  respondWithValidationErrors,
];

const loginUserValidations = [
  body().custom((_, { req }) => {
    const email = req.body.email?.trim();
    const username = req.body.username?.trim();

    if (!email && !username) {
      throw new Error("Email or username is required");
    }

    if (email && username) {
      throw new Error("Provide either email or username, not both");
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Invalid email address");
    }

    return true;
  }),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .bail()
    .isString()
    .withMessage("Password must be a string"),

  respondWithValidationErrors,
];

module.exports = {
  registerUserValidations,
  loginUserValidations,
};
