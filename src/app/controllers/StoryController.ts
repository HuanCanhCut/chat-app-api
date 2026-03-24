import { NextFunction, Response } from 'express'

import StoryService from '../services/StoryService'
import { CreateStoryRequest } from '../validator/api/storySchema'

class StoryController {
    createCategory = async (req: CreateStoryRequest, res: Response, next: NextFunction) => {
        try {
            const { url, type } = req.body
            const decoded = req.decoded

            const story = await StoryService.createStory({ currentUserId: decoded!.sub, url, type })

            res.status(201).json(story)
        } catch (error) {
            next(error)
        }
    }
}

export default new StoryController()
