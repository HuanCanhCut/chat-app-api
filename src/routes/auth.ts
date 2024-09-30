import express from 'express'
const router = express.Router()

import AuthController from '../app/controllers/AuthController'

router.post('/register', AuthController.register.bind(AuthController))
router.post('/login', AuthController.login.bind(AuthController))
router.post('/logout', AuthController.logout.bind(AuthController))
router.post('/loginwithtoken', AuthController.loginWithToken.bind(AuthController))
router.get('/refresh', AuthController.refreshToken.bind(AuthController))
router.post('/verify', AuthController.sendVerifyCode.bind(AuthController))
router.post('/reset-password', AuthController.resetPassword.bind(AuthController))

export default router
