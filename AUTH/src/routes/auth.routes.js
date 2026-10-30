const express = require('express');
const validators = require('../middlewares/validator.middleware')
const router = express.Router();
const authController = require('../controllers/auth.controller')

router.post('/register', validators.registerUserValidations,authController.registerUser);

module.exports = router;
