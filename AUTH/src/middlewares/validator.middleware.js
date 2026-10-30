const { body, validationResult } = require("express-validator");

const respondWithValidationErrors= (req, res, next) =>{
    const errors =validationResult(req);
    if(!errors.isEmpty()){
        return res.status(400).json({errors:errors.array()});
    }
    next();
}
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

module.exports = {
    registerUserValidations
}