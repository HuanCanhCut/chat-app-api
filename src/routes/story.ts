import express from 'express'

import StoryController from '~/app/controllers/StoryController'
import { validate } from '~/app/middlewares/validate'
import { cursorPaginationSchema, uuidSchema } from '~/app/validator/api/common'
import { createStorySchema, getUserViewedStorySchema, reactToStorySchema } from '~/app/validator/api/storySchema'

const router = express.Router()

router.get('/', validate(cursorPaginationSchema), StoryController.getStories)
router.get('/:uuid/viewed', validate(getUserViewedStorySchema), StoryController.getUserViewedStories)
router.get('/:uuid', validate(uuidSchema), StoryController.getUserStories)
router.post('/', validate(createStorySchema), StoryController.createStory)
router.post('/:uuid/view', validate(uuidSchema), StoryController.viewStory)
router.delete('/:uuid', validate(uuidSchema), StoryController.deleteStory)
router.post('/:uuid/react', validate(reactToStorySchema), StoryController.reactToStory)
router.delete('/:uuid/react', validate(uuidSchema), StoryController.removeStoryReacts)

export default router
