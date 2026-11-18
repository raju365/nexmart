const { body, param, validationResult } = require("express-validator");

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const validateAddAddress = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("phone")
    .matches(/^[6-9]\d{9}$/)
    .withMessage("Phone must be a valid 10-digit Indian mobile number"),
  body("line1").trim().notEmpty().withMessage("Address line 1 is required"),
  body("line2").optional().trim(),
  body("city").trim().notEmpty().withMessage("City is required"),
  body("state").trim().notEmpty().withMessage("State is required"),
  body("pincode")
    .matches(/^[1-9]\d{5}$/)
    .withMessage("Pincode must be a valid 6-digit number"),
  body("isDefault")
    .optional()
    .isBoolean()
    .withMessage("isDefault must be true or false"),
  handleValidation,
];

const validateAddressId = [
  param("addressId").isMongoId().withMessage("Invalid address id"),
  handleValidation,
];

module.exports = { validateAddAddress, validateAddressId };