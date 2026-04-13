import { NextFunction, Response } from 'express'

import { responsePagination } from '../response/responsePagination'
import PostService from '../services/PostService'
import ReactionService from '../services/ReactionService'
import { IdRequest } from '../validator/api/common'
import { CursorRequest } from '../validator/api/cursorSchema'
import {
    CreatePostRequest,
    GetPostCommentsRequest,
    GetPostReactionsRequest,
    ReactPostRequest,
} from '../validator/api/postSchema'

class PostController {
    createPost = async (req: CreatePostRequest, res: Response, next: NextFunction) => {
        try {
            const { caption, is_public, media } = req.body

            const decoded = req.decoded

            const post = await PostService.createPost({
                user_id: decoded.sub,
                caption,
                media,
                is_public,
            })

            res.status(201).json({
                data: post,
            })
        } catch (error) {
            return next(error)
        }
    }

    getPosts = async (req: CursorRequest, res: Response, next: NextFunction) => {
        try {
            const { cursor, limit = 10 } = req.query

            const { posts, has_next_page, next_cursor } = await PostService.getPost({
                cursor,
                limit: Number(limit),
                currentUserId: req.decoded.sub,
            })

            res.json({
                data: posts,
                meta: {
                    pagination: {
                        has_next_page,
                        next_cursor,
                    },
                },
            })
        } catch (error) {
            return next(error)
        }
    }

    getPostReactions = async (req: GetPostReactionsRequest, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params
            const { page, per_page, type } = req.query

            const { reactions, count: total } = await ReactionService.getReactionsByReactableId({
                reactionable_id: Number(id),
                reactionable_type: 'Post',
                page: Number(page),
                per_page: Number(per_page),
                type: type || 'all',
            })

            res.json(
                responsePagination({
                    req,
                    data: reactions,
                    total,
                    count: reactions.length,
                    current_page: Number(page),
                    per_page: Number(per_page),
                }),
            )
        } catch (error) {
            return next(error)
        }
    }

    getPostComments = async (req: GetPostCommentsRequest, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params
            const { page, per_page, parent_id } = req.query

            const { comments, total } = await PostService.getPostComment({
                post_id: Number(id),
                page: Number(page),
                per_page: Number(per_page),
                parent_id: Number(parent_id) || null,
            })

            res.json(
                responsePagination({
                    req,
                    data: comments,
                    total,
                    count: comments.length,
                    current_page: Number(page),
                    per_page: Number(per_page),
                }),
            )
        } catch (error) {
            return next(error)
        }
    }

    reactPost = async (req: ReactPostRequest, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params
            const { unified } = req.body

            const decoded = req.decoded

            const reaction = await PostService.reactPost({
                post_id: Number(id),
                user_id: decoded.sub,
                unified,
            })

            res.json({
                data: reaction,
            })
        } catch (error) {
            return next(error)
        }
    }

    unreactPost = async (req: IdRequest, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params

            const decoded = req.decoded

            await PostService.unreactPost({
                post_id: Number(id),
                user_id: decoded.sub,
            })

            res.status(204).send()
        } catch (error) {
            return next(error)
        }
    }

    getPostById = async (req: IdRequest, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params

            const post = await PostService.getPostById(Number(id))

            res.json({
                data: post,
            })
        } catch (error) {
            return next(error)
        }
    }
}

export default new PostController()
