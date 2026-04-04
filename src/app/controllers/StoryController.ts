import { NextFunction, Response } from 'express'

import { responsePagination } from '../response/responsePagination'
import StoryService from '../services/StoryService'
import { IdRequest, PaginationRequest, UuidRequest } from '../validator/api/common'
import { CreateStoryRequest, ReactToStoryRequest } from '../validator/api/storySchema'

class StoryController {
    createStory = async (req: CreateStoryRequest, res: Response, next: NextFunction) => {
        try {
            const { url, type, background_url } = req.body
            const decoded = req.decoded

            const story = await StoryService.createStory({ currentUserId: decoded!.sub, url, type, background_url })

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

    deleteStory = async (req: UuidRequest, res: Response, next: NextFunction) => {
        try {
            const { uuid } = req.params
            const decoded = req.decoded

            await StoryService.deleteStory({ currentUserId: decoded!.sub, storyUuid: uuid })

            res.sendStatus(204)
        } catch (error) {
            next(error)
        }
    }

    reactToStory = async (req: ReactToStoryRequest, res: Response, next: NextFunction) => {
        try {
            const { uuid } = req.params
            const { unified } = req.body
            const decoded = req.decoded

            const story = await StoryService.reactToStory({
                currentUserId: decoded!.sub,
                storyUuid: uuid,
                unified,
            })

            res.json({
                data: story,
            })
        } catch (error) {
            next(error)
        }
    }

    removeStoryReacts = async (req: UuidRequest, res: Response, next: NextFunction) => {
        try {
            const { uuid } = req.params
            const decoded = req.decoded

            await StoryService.removeStoryReacts({
                currentUserId: decoded!.sub,
                storyUuid: uuid,
            })

            res.sendStatus(204)
        } catch (error) {
            next(error)
        }
    }

    getStoriesByUserId = async (req: IdRequest, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params

            const stories = await StoryService.getStoriesByUserId({
                userId: Number(id),
            })

            res.json({
                data: stories,
            })
        } catch (error) {
            next(error)
        }
    }
}

export default new StoryController()
