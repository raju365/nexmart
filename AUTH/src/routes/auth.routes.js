const express = require("express");
const validators = require("../middlewares/validator.middleware");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const addressController = require("../controllers/address.controller");
const {
  validateAddAddress,
  validateAddressId,
} = require("../validators/address.validator");


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

router.get("/users/me/addresses", authMiddleware, addressController.getAddresses);

router.post(
  "/users/me/addresses",
  authMiddleware,
  validateAddAddress,
  addressController.addAddress,
);

router.delete(
  "/users/me/addresses/:addressId",
  authMiddleware,
  validateAddressId,
  addressController.deleteAddress,
);
router.patch(
  "/users/me/addresses/:addressId/default",
  authMiddleware,
  validateAddressId,
  addressController.setDefaultAddress,
);

module.exports = router;
