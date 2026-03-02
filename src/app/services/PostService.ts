import { AppError, InternalServerError } from '../errors/errors'
import Post from '../models/PostModel'

class PostService {
    createPost = async ({
        user_id,
        media_type,
        media_url,
        caption,
        is_public,
    }: {
        user_id: number
        media_type?: 'image' | 'video'
        media_url?: string
        caption?: string
        is_public: boolean
    }) => {
        try {
            const post = await Post.create({
                user_id,
                media_type,
                media_url,
                caption,
                is_public,
            })

            return post
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message + ' ' + error.stack })
        }
    }
}

export default new PostService()
