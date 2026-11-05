const express = require("express");
const validators = require("../middlewares/validator.middleware");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const authMiddleware = require("../middlewares/auth.middleware");

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
router.get("/me", authMiddleware, authController.getCurrentUser);
router.post("/logout", authController.logoutUser);
module.exports = router;
