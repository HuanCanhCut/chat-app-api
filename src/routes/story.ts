import express from 'express'

import StoryController from '~/app/controllers/StoryController'
import { validate } from '~/app/middlewares/validate'
import { idSchema } from '~/app/validator/api/common'
import { createStorySchema } from '~/app/validator/api/storySchema'

const router = express.Router()

router.post('/', validate(createStorySchema), StoryController.createCategory)
router.get('/', StoryController.getStories)
router.delete('/:id', validate(idSchema), StoryController.deleteStory)

export default router
