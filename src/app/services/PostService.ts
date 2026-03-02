import { AppError, InternalServerError } from '../errors/errors'
import { User } from '../models'
import Post from '../models/PostModel'
import Reaction from '../models/ReactionModel'
import { sequelize } from '~/config/database'

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

    getPost = async ({ page, per_page }: { page: number; per_page: number }) => {
        try {
            const { rows: posts, count: total } = await Post.findAndCountAll({
                distinct: true,
                subQuery: false,
                include: {
                    model: User,
                    as: 'user',
                    attributes: {
                        exclude: ['password', 'email'],
                    },
                },
                attributes: {
                    include: [
                        [
                            sequelize.literal(`
                                (
                                    SELECT 
                                        COUNT(1) 
                                    FROM 
                                        comments 
                                    WHERE 
                                        comments.post_id = Post.id
                                )`),
                            'comments_count',
                        ],
                    ],
                },
                order: [['created_at', 'DESC']],
                limit: per_page,
                offset: (page - 1) * per_page,
            })

            const promises = posts.map(async (post) => {
                const [top_reactions, total_reactions] = await Promise.all([
                    Reaction.findAll({
                        where: {
                            reactionable_id: post.id,
                            reactionable_type: 'Post',
                        },
                        include: [
                            {
                                model: User,
                                as: 'user_reaction',
                                attributes: {
                                    exclude: ['password', 'email'],
                                },
                            },
                        ],
                        group: ['react'],
                        order: [[sequelize.fn('COUNT', sequelize.col('react')), 'DESC']],
                        limit: 2,
                    }),

                    Reaction.count({
                        where: {
                            reactionable_id: post.id,
                            reactionable_type: 'Post',
                        },
                    }),
                ])

                if (top_reactions.length > 0) {
                    post.dataValues.top_reactions = top_reactions.slice(0, 2)
                }

                post.dataValues.total_reactions = total_reactions

                return post
            })

            const postData = await Promise.all(promises)

            return { posts: postData, total }
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message + ' ' + error.stack })
        }
    }
}

export default new PostService()
