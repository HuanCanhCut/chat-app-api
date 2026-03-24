import express from 'express'

import StoryController from '~/app/controllers/StoryController'
import verifyToken from '~/app/middlewares/verifyToken'

const router = express.Router()

router.post('/', verifyToken, StoryController.createCategory)

export default router
