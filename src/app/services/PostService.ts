import { Op } from 'sequelize'

import { AppError, InternalServerError, NotFoundError } from '../errors/errors'
import { User } from '../models'
import Comment from '../models/CommentModel'
import PostMedia from '../models/PostMedia'
import Post from '../models/PostModel'
import Reaction from '../models/ReactionModel'
import { sequelize } from '~/config/database'
import { PostReactionUnified } from '~/types/reactionType'

class PostService {
    createPost = async ({
        user_id,
        media,
        caption,
        is_public,
    }: {
        user_id: number
        media?: Array<{ media_url: string; media_type: 'image' | 'video' }>
        caption?: string
        is_public: boolean
    }) => {
        try {
            const post = await Post.create({
                user_id,
                caption,
                is_public,
            })

            if (media && media.length > 0 && post.id) {
                await PostMedia.bulkCreate(
                    media.map((m) => ({
                        post_id: post.id!,
                        media_url: m.media_url,
                        media_type: m.media_type,
                    })),
                )
            }

            return await Post.findByPk(post.id, {
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: {
                            exclude: ['password', 'email'],
                        },
                    },
                    {
                        model: PostMedia,
                        as: 'post_media',
                    },
                ],
            })
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
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: {
                            exclude: ['password', 'email'],
                        },
                    },
                    {
                        model: PostMedia,
                        as: 'post_media',
                    },
                ],
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
                logging: console.log,
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

    reactPost = async ({
        post_id,
        unified,
        user_id,
    }: {
        post_id: number
        unified: PostReactionUnified
        user_id: number
    }) => {
        try {
            const hasPost = await Post.findByPk(post_id)

            if (!hasPost) {
                throw new NotFoundError({ message: 'Bài viết không tồn tại' })
            }

            const [reaction, created] = await Reaction.findOrCreate({
                where: {
                    reactionable_id: post_id,
                    reactionable_type: 'Post',
                    user_id,
                },
                defaults: {
                    react: unified,
                    user_id,
                    reactionable_id: post_id,
                    reactionable_type: 'Post',
                },
            })

            // if reaction already exists
            if (!created) {
                reaction.react = unified
                await reaction.save()
            }

            return reaction
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message + ' ' + error.stack })
        }
    }

    unreactPost = async ({ post_id, user_id }: { post_id: number; user_id: number }) => {
        try {
            const hasPost = await Post.findByPk(post_id)

            if (!hasPost) {
                throw new NotFoundError({ message: 'Bài viết không tồn tại' })
            }

            await Reaction.destroy({
                where: {
                    reactionable_id: post_id,
                    reactionable_type: 'Post',
                    user_id,
                },
            })

            return
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message + ' ' + error.stack })
        }
    }
}

export default new PostService()
