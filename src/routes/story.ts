import express from 'express'

import StoryController from '~/app/controllers/StoryController'
import { validate } from '~/app/middlewares/validate'
import { uuidSchema } from '~/app/validator/api/common'
import { createStorySchema, reactToStorySchema } from '~/app/validator/api/storySchema'

const router = express.Router()

router.get('/', StoryController.getStories)
router.get('/:uuid', validate(uuidSchema), StoryController.getUserStories)
router.post('/', validate(createStorySchema), StoryController.createStory)
router.delete('/:uuid', validate(uuidSchema), StoryController.deleteStory)
router.post('/:uuid/react', validate(reactToStorySchema), StoryController.reactToStory)
router.delete('/:uuid/react', validate(uuidSchema), StoryController.removeStoryReacts)

export default router
