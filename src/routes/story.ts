import express from 'express'

import StoryController from '~/app/controllers/StoryController'
import { validate } from '~/app/middlewares/validate'
import { idSchema } from '~/app/validator/api/common'
import { createStorySchema, reactToStorySchema } from '~/app/validator/api/storySchema'

const router = express.Router()

router.post('/', validate(createStorySchema), StoryController.createCategory)
router.get('/', StoryController.getStories)
router.delete('/:id', validate(idSchema), StoryController.deleteStory)
router.post('/:id/react', validate(reactToStorySchema), StoryController.reactToStory)
router.delete('/:id/react', validate(idSchema), StoryController.removeStoryReacts)

export default router
