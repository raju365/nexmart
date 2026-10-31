const express = require("express");
const validators = require("../middlewares/validator.middleware");
const router = express.Router();
const authController = require("../controllers/auth.controller");

router.post(
  "/register",
  validators.registerUserValidations,
  authController.registerUser,
);
router.post(
  "/login",
  validators.loginUserValidations,
  authController.loginUser,
);
router.post("/logout", authController.logoutUser);
module.exports = router;
