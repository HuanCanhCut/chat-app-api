const express = require('express')
const router = express.Router()

const AuthController = require('../app/controllers/AuthController')
const verifyToken = require('../app/middlewares/verifyToken')

router.post('/register', AuthController.register.bind(AuthController))
router.post('/login', AuthController.login.bind(AuthController))
router.get('/me', verifyToken, AuthController.getCurrentUser)
router.post('/loginwithtoken', AuthController.loginWithToken.bind(AuthController))
router.get('/refresh', AuthController.refreshToken.bind(AuthController))

module.exports = router
