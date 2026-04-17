import { NextFunction, Response } from 'express'

import { responseCursorPagination, responsePagination } from '../response/responsePagination'
import PostService from '../services/PostService'
import ReactionService from '../services/ReactionService'
import { CreateCommentRequest, GetPostCommentRequest } from '../validator/api/commentSchema'
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

    getPostComments = async (req: GetPostCommentRequest, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params
            const { limit, cursor, parent_id } = req.query

            const { comments, next_cursor } = await PostService.getPostComment({
                post_id: Number(id),
                limit: Number(limit),
                cursor,
                parent_id: Number(parent_id) || null,
            })

            res.json(
                responseCursorPagination({
                    req,
                    data: comments,
                    limit: Number(limit),
                    next_cursor,
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

    // [POST] /posts/:id/comment
    createComment = async (req: CreateCommentRequest, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params
            const { content, parent_id } = req.body

            const decoded = req.decoded

            const comment = await PostService.createComment({
                postId: Number(id),
                currentUserId: decoded.sub,
                content,
                parentId: Number(parent_id) || null,
            })

            res.json({
                data: comment,
            })
        } catch (error) {
            return next(error)
        }
    }
}

export default new PostController()
