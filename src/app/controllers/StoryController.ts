import { NextFunction, Response } from 'express'

import { responsePagination } from '../response/responsePagination'
import StoryService from '../services/StoryService'
import { PaginationRequest } from '../validator/api/common'
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

    getStories = async (req: PaginationRequest, res: Response, next: NextFunction) => {
        try {
            const { page, per_page } = req.query
            const decoded = req.decoded

            const { stories, total } = await StoryService.getStories({
                page: Number(page),
                per_page: Number(per_page),
                currentUserId: decoded!.sub,
            })

            res.json(
                responsePagination({
                    req,
                    data: stories,
                    total,
                    count: stories.length,
                    current_page: Number(page),
                    per_page: Number(per_page),
                }),
            )
        } catch (error) {
            next(error)
        }
    }
}

export default new StoryController()
