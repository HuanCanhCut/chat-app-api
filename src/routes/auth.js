const express = require('express')
const router = express.Router()

const AuthController = require('../app/controllers/AuthController')
const verifyToken = require('../app/middlewares/verifyToken')

router.post('/register', AuthController.register.bind(AuthController))
router.post('/login', AuthController.login.bind(AuthController))
router.get('/me', verifyToken, AuthController.getCurrentUser.bind(AuthController))
router.post('/loginwithtoken', AuthController.loginWithToken.bind(AuthController))
router.get('/refresh', AuthController.refreshToken.bind(AuthController))
router.post('/verify', AuthController.sendVerifyCode.bind(AuthController))
router.post('/reset-password', AuthController.resetPassword.bind(AuthController))

module.exports = router
