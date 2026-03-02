import { NextFunction, Response } from 'express'

import PostService from '../services/PostService'
import { CreatePostRequest } from '../validator/api/postSchema'

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
}

export default new PostController()
