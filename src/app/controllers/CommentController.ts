import { NextFunction, Response } from 'express'

import { responseCursorPagination } from '../response/responsePagination'
import CommentService from '../services/CommentService'
import { CreateCommentRequest, GetPostCommentRequest } from '../validator/api/commentSchema'
import { ReactCommentRequest } from '../validator/api/commentSchema'
import { IdRequest } from '../validator/api/common'

class CommentController {
    // [POST] /posts/:id/comment
    createComment = async (req: CreateCommentRequest, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params
            const { content, parent_id } = req.body

            const decoded = req.decoded

            const comment = await CommentService.createComment({
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

    reactComment = async (req: ReactCommentRequest, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params
            const { unified } = req.body

            const decoded = req.decoded

            const reaction = await CommentService.reactComment({
                comment_id: Number(id),
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

    unreactComment = async (req: IdRequest, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params

            const decoded = req.decoded

            await CommentService.unreactComment({
                comment_id: Number(id),
                user_id: decoded.sub,
            })

            res.status(204).send()
        } catch (error) {
            return next(error)
        }
    }

    getCommentById = async (req: IdRequest, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params

            const comment = await CommentService.getCommentById({
                comment_id: Number(id),
                currentUserId: req.decoded.sub,
            })

            res.json({
                data: comment,
            })
        } catch (error) {
            return next(error)
        }
    }

    getPostComments = async (req: GetPostCommentRequest, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params
            const { limit, cursor, parent_id } = req.query

            const { comments, next_cursor } = await CommentService.getPostComment({
                post_id: Number(id),
                limit: Number(limit),
                cursor,
                parent_id: Number(parent_id) || null,
                currentUserId: req.decoded.sub,
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

    deleteComment = async (req: IdRequest, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params

            const decoded = req.decoded

            await CommentService.deleteComment({
                comment_id: Number(id),
                user_id: decoded.sub,
            })

            res.sendStatus(204)
        } catch (error) {
            return next(error)
        }
    }
}

export default new CommentController()
