import express from 'express'
const router = express.Router()

import ThemeController from '~/app/controllers/ThemeController'
import verifyToken from '~/app/middlewares/verifyToken'

router.get('/', verifyToken, ThemeController.getTheme.bind(ThemeController))

export default router
