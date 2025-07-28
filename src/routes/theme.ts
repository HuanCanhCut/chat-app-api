import express from 'express'
const router = express.Router()

import ThemeController from '~/app/controllers/ThemeController'

router.get('/', ThemeController.getTheme.bind(ThemeController))

export default router
