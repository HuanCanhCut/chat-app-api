import express from 'express'

import StoryController from '~/app/controllers/StoryController'
import { validate } from '~/app/middlewares/validate'
import { createStorySchema } from '~/app/validator/api/storySchema'

const router = express.Router()

router.post('/', validate(createStorySchema), StoryController.createCategory)
router.get('/', StoryController.getStories)

export default router
