import { chunk } from 'lodash'
import moment from 'moment'
import { Op } from 'sequelize'

import { NotFoundError } from '../errors/errors'
import { PostScore, User } from '../models'
import Comment from '../models/CommentModel'
import PostMedia from '../models/PostMedia'
import Post from '../models/PostModel'
import Reaction from '../models/ReactionModel'
import { decodeCursor, encodeCursor } from '../utils/cursor'
import { handleServiceError } from '../utils/handleServiceError'
import { GetPostCursorQuery } from '../validator/api/postSchema'
import { sequelize } from '~/config/database'
import { BaseReactionUnified } from '~/types/reactionType'

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
                reaction_count: 0,
                comment_count: 0,
                share_count: 0,
            })

            await sequelize.transaction(async (t) => {
                await PostScore.create(
                    {
                        post_id: post.id!,
                        score: 0,
                    },
                    { transaction: t },
                )

                if (media?.length) {
                    await PostMedia.bulkCreate(
                        media.map((m) => ({
                            post_id: post.id!,
                            media_url: m.media_url,
                            media_type: m.media_type,
                        })),
                        { transaction: t },
                    )
                }
            })

            return await Post.findByPk(post.id, {
                include: [
                    {
                        model: User,
                        as: 'user',
                    },
                    {
                        model: PostMedia,
                        as: 'post_media',
                    },
                ],
            })
        } catch (error) {
            return handleServiceError(error)
        }
    }

    getPosts = async ({ cursor, limit, currentUserId }: { cursor?: string; limit: number; currentUserId: number }) => {
        try {
            let whereCondition = {}

            if (cursor) {
                const { score, id } = decodeCursor<GetPostCursorQuery>(cursor)

                whereCondition = {
                    [Op.or]: [
                        {
                            '$post_score.score$': {
                                [Op.lt]: score,
                            },
                        },
                        {
                            [Op.and]: [
                                {
                                    '$post_score.score$': score,
                                },
                                {
                                    id: {
                                        [Op.lt]: id,
                                    },
                                },
                            ],
                        },
                    ],
                }
            }

            const posts = (await Post.findAll({
                subQuery: false,
                include: [
                    {
                        model: PostScore,
                        as: 'post_score',
                        attributes: ['score'],
                        required: true,
                    },
                    {
                        model: User,
                        as: 'user',
                    },
                    {
                        model: PostMedia,
                        as: 'post_media',
                        required: false,
                        separate: true,
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
                        [
                            sequelize.literal(`
                                (
                                    SELECT
                                        react
                                    FROM
                                        reactions
                                    WHERE
                                        reactions.reactionable_type = 'Post' AND
                                        reactions.reactionable_id = Post.id AND
                                        reactions.user_id = ${currentUserId}
                                )`),
                            'reaction',
                        ],
                    ],
                },
                where: whereCondition,
                order: [
                    [
                        {
                            model: PostScore,
                            as: 'post_score',
                        },
                        'score',
                        'DESC',
                    ],
                    ['id', 'DESC'],
                ],
                limit: limit + 1,
            })) as (Post & { post_score: PostScore })[]

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

                delete (post.dataValues as any).post_score
            })

            const hasNextPage = posts.length > limit
            const data = hasNextPage ? posts.slice(0, limit) : posts

            const lastPost = data[data.length - 1]
            const nextCursor =
                hasNextPage && lastPost ? encodeCursor({ score: lastPost.post_score.score, id: lastPost.id }) : null

            return {
                posts: data,
                next_cursor: nextCursor,
            }
        } catch (error) {
            return handleServiceError(error)
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
        } catch (error) {
            return handleServiceError(error)
        }
    }

    reactPost = async ({
        post_id,
        unified,
        user_id,
    }: {
        post_id: number
        unified: BaseReactionUnified
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
            } else {
                await Post.increment('reaction_count', {
                    where: {
                        id: post_id,
                    },
                })
            }

            return reaction
        } catch (error) {
            return handleServiceError(error)
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

            await Post.decrement('reaction_count', {
                where: {
                    id: post_id,
                },
            })

            return
        } catch (error) {
            return handleServiceError(error)
        }
    }

    updatePostScore = async (postId?: number) => {
        const calculateScore = (post: Post): { post_id: number; score: number } => {
            const ageInHours = post.created_at ? (Date.now() - new Date(post.created_at).getTime()) / 3600000 : 0
            const engagement = post.reaction_count * 1.0 + post.comment_count * 2.0 + post.share_count * 3.0
            const score = engagement / Math.pow(ageInHours + 2, 1.5)

            return { post_id: post.id!, score }
        }

        if (postId !== undefined) {
            const post = await Post.findByPk(postId)
            if (!post) return

            const score = calculateScore(post)
            await PostScore.upsert(score)
            return
        }

        const posts = await Post.findAll({
            include: {
                model: PostScore,
                as: 'post_score',
                attributes: ['updated_at'],
                required: false,
            },
            where: {
                [Op.or]: [
                    {
                        created_at: {
                            [Op.gte]: moment().subtract(7, 'days').toDate(),
                        },
                    },
                    {
                        '$post_score.updated_at$': {
                            [Op.is]: null,
                        },
                    },
                ],
            },
        })

        const scores = posts.map(calculateScore)

        const BATCHES_SIZE = 100

        const batches = chunk(scores, BATCHES_SIZE)

        for (const batch of batches) {
            await PostScore.bulkCreate(batch, {
                updateOnDuplicate: ['score', 'updated_at'],
            })
        }

        return scores.length
    }

    getPostById = async (id: number) => {
        try {
            const post = await Post.findByPk(id)

            if (!post) {
                throw new NotFoundError({ message: 'Bài viết không tồn tại' })
            }

            const topReactions = await Reaction.findAll({
                where: {
                    reactionable_type: 'Post',
                    reactionable_id: id,
                },
                attributes: ['react', 'reactionable_id'],
                group: ['react', 'reactionable_id'],
                order: [[sequelize.fn('COUNT', sequelize.col('react')), 'DESC']],
            })

            post.setDataValue('top_reactions', topReactions)

            return post
        } catch (error) {
            return handleServiceError(error)
        }
    }
}

export default new PostService()
