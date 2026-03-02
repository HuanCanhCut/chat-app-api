import { Op } from 'sequelize'

import { AppError, InternalServerError } from '../errors/errors'
import { User } from '../models'
import Comment from '../models/CommentModel'
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
                        [
                            sequelize.literal(`
                                (
                                    SELECT 
                                        COUNT(1) 
                                    FROM 
                                        reactions 
                                    WHERE 
                                        reactions.reactionable_id = Post.id AND
                                        reactions.reactionable_type = 'Post'
                                )`),
                            'reactions_count',
                        ],
                    ],
                },
                order: [['created_at', 'DESC']],
                limit: per_page,
                offset: (page - 1) * per_page,
            })

            const postIds = posts.map((post) => post.id)

            const topReactions = await Reaction.findAll({
                where: {
                    reactionable_id: {
                        [Op.in]: postIds as number[],
                    },
                    reactionable_type: 'Post',
                },
                attributes: ['react', 'reactionable_id'],
                group: ['react', 'reactionable_id'],
                order: [[sequelize.fn('COUNT', sequelize.col('react')), 'DESC']],
            })

            const topReactionsMap = topReactions.reduce((acc: Record<string, Reaction[]>, curr) => {
                if (!acc[curr.reactionable_id]) {
                    acc[curr.reactionable_id] = []
                }

                if (acc[curr.reactionable_id].length <= 2) {
                    acc[curr.reactionable_id].push(curr)
                }

                return acc
            }, {})

            posts.forEach((post) => {
                post.setDataValue('top_reactions', topReactionsMap[post.id as number])

                return post
            })

            // const promises = posts.map(async (post) => {
            //     const [top_reactions, total_reactions] = await Promise.all([
            //         Reaction.findAll({
            //             where: {
            //                 reactionable_id: post.id,
            //                 reactionable_type: 'Post',
            //             },
            //             include: [
            //                 {
            //                     model: User,
            //                     as: 'user_reaction',
            //                     attributes: {
            //                         exclude: ['password', 'email'],
            //                     },
            //                 },
            //             ],
            //             group: ['react'],
            //             order: [[sequelize.fn('COUNT', sequelize.col('react')), 'DESC']],
            //             limit: 2,
            //         }),

            //         Reaction.count({
            //             where: {
            //                 reactionable_id: post.id,
            //                 reactionable_type: 'Post',
            //             },
            //         }),
            //     ])

            //     if (top_reactions.length > 0) {
            //         post.dataValues.top_reactions = top_reactions.slice(0, 2)
            //     }

            //     post.dataValues.total_reactions = total_reactions

            //     return post
            // })

            // const postData = await Promise.all(promises)

            return { posts, total }
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message + ' ' + error.stack })
        }
    }

    getPostComment = async ({
        post_id,
        page,
        per_page,
        parent_id,
    }: {
        post_id: number
        page: number
        per_page: number
        parent_id?: number | null
    }) => {
        try {
            const { rows: comments, count: total } = await Comment.findAndCountAll({
                distinct: true,
                include: {
                    model: User,
                    as: 'user',
                    attributes: {
                        exclude: ['password', 'email'],
                    },
                },
                where: {
                    post_id,
                    parent_id: parent_id ? parent_id : { [Op.is]: null },
                },
                limit: per_page,
                offset: (page - 1) * per_page,
                order: [['id', 'DESC']],
                logging: console.log,
            })

            return { comments, total }
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message + ' ' + error.stack })
        }
    }
}

export default new PostService()
