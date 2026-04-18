import { NextFunction, Response } from 'express'

import { responseCursorPagination, responsePagination } from '../response/responsePagination'
import PostService from '../services/PostService'
import ReactionService from '../services/ReactionService'
import { IdRequest } from '../validator/api/common'
import {
    CreatePostRequest,
    GetPostReactionsRequest,
    GetPostsRequest,
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

    getPosts = async (req: GetPostsRequest, res: Response, next: NextFunction) => {
        try {
            const { cursor, limit = 10 } = req.query

            const { posts, next_cursor } = await PostService.getPosts({
                cursor,
                limit: Number(limit),
                currentUserId: req.decoded.sub,
            })

            res.json(
                responseCursorPagination({
                    req,
                    data: posts,
                    limit: Number(limit),
                    next_cursor,
                }),
            )
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
