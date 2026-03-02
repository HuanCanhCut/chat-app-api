import { NextFunction, Response } from 'express'

import { responsePagination } from '../response/responsePagination'
import PostService from '../services/PostService'
import ReactionService from '../services/ReactionService'
import { PaginationRequest } from '../validator/api/common'
import { CreatePostRequest, GetPostReactionsRequest } from '../validator/api/postSchema'

class PostController {
    createPost = async (req: CreatePostRequest, res: Response, next: NextFunction) => {
        try {
            const { caption, is_public, media_type, media_url } = req.body

            const decoded = req.decoded

            const post = await PostService.createPost({
                user_id: decoded.sub,
                caption,
                media_type,
                media_url,
                is_public: is_public === 'true' ? true : false,
            })

            res.status(201).json({
                data: post,
            })
        } catch (error) {
            return next(error)
        }
    }

    getPosts = async (req: PaginationRequest, res: Response, next: NextFunction) => {
        try {
            const { page, per_page } = req.query

            const { posts, total } = await PostService.getPost({ page: Number(page), per_page: Number(per_page) })

            res.json(
                responsePagination({
                    req,
                    data: posts,
                    total,
                    count: posts.length,
                    current_page: Number(page),
                    per_page: Number(per_page),
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
}

export default new PostController()
