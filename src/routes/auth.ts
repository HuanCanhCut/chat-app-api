import express from 'express'
const router = express.Router()

import AuthController from '../app/controllers/AuthController'
import { validate } from '~/app/middlewares/validate'
import {
    loginSchema,
    loginWithTokenSchema,
    registerSchema,
    resetPasswordSchema,
    sendVerifyCodeSchema,
} from '~/app/validator/api/authSchema'

router.post('/register', validate(registerSchema), AuthController.register.bind(AuthController))
router.post('/login', validate(loginSchema), AuthController.login.bind(AuthController))
router.post('/logout', AuthController.logout.bind(AuthController))
router.post('/loginwithtoken', validate(loginWithTokenSchema), AuthController.loginWithToken.bind(AuthController))
router.get('/refresh', AuthController.refreshToken.bind(AuthController))
router.post('/verify', validate(sendVerifyCodeSchema), AuthController.sendVerifyCode.bind(AuthController))
router.post('/reset-password', validate(resetPasswordSchema), AuthController.resetPassword.bind(AuthController))

export default router
