import { NextFunction, Response } from 'express'

import { responseCursorPagination, responsePagination } from '../response/responsePagination'
import ConversationService from '../services/ConversationService'
import StoryService from '../services/StoryService'
import { UuidRequest } from '../validator/api/common'
import {
    CreateStoryRequest,
    GetStoriesRequest,
    GetUserViewedStoryRequest,
    ReactToStoryRequest,
} from '../validator/api/storySchema'

class StoryController {
    createStory = async (req: CreateStoryRequest, res: Response, next: NextFunction) => {
        try {
            const { url, type, caption } = req.body
            const decoded = req.decoded

            const story = await StoryService.createStory({
                currentUserId: decoded!.sub,
                url,
                type,
                caption,
            })

            res.status(201).json(story)
        } catch (error) {
            next(error)
        }
    }

    getStories = async (req: GetStoriesRequest, res: Response, next: NextFunction) => {
        try {
            const { cursor, limit } = req.query
            const decoded = req.decoded

            const { stories, next_cursor } = await StoryService.getStories({
                cursor,
                limit: Number(limit),
                currentUserId: decoded!.sub,
            })

            res.json(
                responseCursorPagination({
                    req,
                    data: stories,
                    limit: Number(limit),
                    next_cursor: next_cursor,
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

            const reactions = await StoryService.reactToStory({
                currentUserId: decoded!.sub,
                storyUuid: uuid,
                unified,
            })

            res.json({
                data: reactions,
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

    getUserStories = async (req: UuidRequest, res: Response, next: NextFunction) => {
        try {
            const { uuid } = req.params
            const decoded = req.decoded

            const stories = await StoryService.getUserStories({
                uuid,
                currentUserId: decoded!.sub,
            })

            const generalConversation = await ConversationService.generalConversation({
                currentUserId: decoded!.sub,
                targetUserId: stories[0].user_id,
            })

            res.json({
                data: stories,
                meta: {
                    general_conversation: generalConversation,
                },
            })
        } catch (error) {
            next(error)
        }
    }

    viewStory = async (req: UuidRequest, res: Response, next: NextFunction) => {
        try {
            const { uuid } = req.params
            const decoded = req.decoded

            await StoryService.viewStory({
                currentUserId: decoded!.sub,
                storyUuid: uuid,
            })

            res.sendStatus(204)
        } catch (error) {
            next(error)
        }
    }

    getUserViewedStories = async (req: GetUserViewedStoryRequest, res: Response, next: NextFunction) => {
        try {
            const { uuid } = req.params
            const { page, per_page } = req.query
            const decoded = req.decoded

            const { userViewedStories, total } = await StoryService.getUserViewedStories({
                storyUuid: uuid,
                page: Number(page),
                per_page: Number(per_page),
                currentUserId: decoded!.sub,
            })

            res.json(
                responsePagination({
                    req,
                    data: userViewedStories,
                    total,
                    count: userViewedStories.length,
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
