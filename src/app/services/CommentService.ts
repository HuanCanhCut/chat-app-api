import { Op } from 'sequelize'

import { ForBiddenError, NotFoundError } from '../errors/errors'
import { User } from '../models'
import Comment from '../models/CommentModel'
import Post from '../models/PostModel'
import Reaction from '../models/ReactionModel'
import { decodeCursor, encodeCursor } from '../utils/cursor'
import { handleServiceError } from '../utils/handleServiceError'
import { LastIdCursor } from '../validator/api/common'
import ReactionService from './ReactionService'
import { sequelize } from '~/config/database'

class CommentService {
    createComment = async ({
        postId,
        content,
        parentId,
        currentUserId,
    }: {
        postId: number
        content: string
        parentId: number | null
        currentUserId: number
    }) => {
        try {
            const hasPost = await Post.findByPk(postId)

            if (!hasPost) {
                throw new NotFoundError({ message: 'Bài viết không tồn tại' })
            }

            if (parentId) {
                const hasParentComment = await Comment.findByPk(parentId)

                if (!hasParentComment) {
                    throw new NotFoundError({ message: 'Bình luận cha không tồn tại' })
                }
            }

            const comment = await sequelize.transaction(async (t) => {
                const newComment = await Comment.create(
                    {
                        post_id: postId,
                        user_id: currentUserId,
                        content,
                        parent_id: parentId,
                    },
                    { transaction: t },
                )

                return newComment
            })

            const commentData = await Comment.findByPk(comment.id, {
                include: {
                    model: User,
                    as: 'user',
                },
            })

            return commentData
        } catch (error) {
            return handleServiceError(error)
        }
    }

    getPostComment = async ({
        post_id,
        limit,
        cursor,
        parent_id,
        currentUserId,
    }: {
        post_id: number
        limit: number
        cursor?: string
        parent_id?: number | null
        currentUserId: number
    }) => {
        try {
            const whereClause: Record<string, unknown> = {
                post_id,
                parent_id: parent_id ? parent_id : { [Op.is]: null },
            }

            if (cursor) {
                const { last_id } = decodeCursor<LastIdCursor>(cursor)

                whereClause.id = {
                    [Op.lt]: last_id,
                }
            }

            const comments = await Comment.findAll({
                include: [
                    {
                        model: User,
                        as: 'user',
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
                                        reactions
                                    WHERE
                                        reactions.reactionable_type = 'Comment' AND
                                        reactions.reactionable_id = Comment.id
                                )
                        `),
                            'reaction_count',
                        ],
                        [
                            sequelize.literal(`
                                (
                                    SELECT
                                        react
                                    FROM
                                        reactions
                                    WHERE
                                        reactions.reactionable_type = 'Comment' AND
                                        reactions.reactionable_id = Comment.id
                                        AND reactions.user_id = ${currentUserId}
                                    LIMIT 1
                                )
                        `),
                            'react',
                        ],
                        [
                            sequelize.literal(`
                                (
                                    SELECT
                                        COUNT(1)
                                    FROM
                                        comments
                                    WHERE
                                        comments.parent_id = Comment.id
                                        AND comments.deleted_at IS NULL
                                )
                        `),
                            'reply_count',
                        ],
                    ],
                },
                where: whereClause,
                limit: limit + 1,
                order: [['id', 'DESC']],
            })

            const topReactionsMap = await ReactionService.getTopReactions({
                reactionableIds: comments.map((comment) => comment.id!),
                reactionableType: 'Comment',
                limit: 2,
            })

            comments.forEach((comment) => {
                comment.setDataValue('top_reactions', topReactionsMap[comment.id!])
            })

            const hasMore = comments.length > limit
            const data = hasMore ? comments.slice(0, limit) : comments

            const nextCursor = hasMore ? encodeCursor<LastIdCursor>({ last_id: data[data.length - 1].id! }) : null

            return { comments: data, next_cursor: nextCursor }
        } catch (error) {
            return handleServiceError(error)
        }
    }

    reactComment = async ({
        comment_id,
        user_id,
        unified,
    }: {
        comment_id: number
        user_id: number
        unified: string
    }) => {
        try {
            const hasComment = await Comment.findByPk(comment_id)

            if (!hasComment) {
                throw new NotFoundError({ message: 'Bình luận không tồn tại' })
            }

            const hasReaction = await Reaction.findOne({
                where: {
                    reactionable_id: comment_id,
                    reactionable_type: 'Comment',
                    user_id,
                },
            })

            if (hasReaction) {
                await hasReaction.update({ react: unified })
                return hasReaction
            }

            const reaction = await Reaction.create({
                react: unified,
                user_id,
                reactionable_id: comment_id,
                reactionable_type: 'Comment',
            })

            return reaction
        } catch (error) {
            return handleServiceError(error)
        }
    }

    unreactComment = async ({ comment_id, user_id }: { comment_id: number; user_id: number }) => {
        try {
            const hasComment = await Comment.findByPk(comment_id)

            if (!hasComment) {
                throw new NotFoundError({ message: 'Bình luận không tồn tại' })
            }

            await Reaction.destroy({
                where: {
                    reactionable_id: comment_id,
                    reactionable_type: 'Comment',
                    user_id,
                },
            })

            return
        } catch (error) {
            return handleServiceError(error)
        }
    }

    getCommentById = async ({ comment_id, currentUserId }: { comment_id: number; currentUserId: number }) => {
        try {
            const comment = await Comment.findByPk(comment_id, {
                include: {
                    model: User,
                    as: 'user',
                },
                attributes: {
                    include: [
                        [
                            sequelize.literal(`
                                (
                                    SELECT
                                        react
                                    FROM
                                        reactions
                                    WHERE
                                        reactions.reactionable_type = 'Comment' AND
                                        reactions.reactionable_id = Comment.id
                                        AND reactions.user_id = ${currentUserId}
                                    LIMIT 1
                                )
                        `),
                            'react',
                        ],
                    ],
                },
            })

            if (!comment) {
                throw new NotFoundError({ message: 'Bình luận không tồn tại' })
            }

            const topReactionsMap = await ReactionService.getTopReactions({
                reactionableIds: [comment_id],
                reactionableType: 'Comment',
                limit: 2,
            })

            comment.setDataValue('top_reactions', topReactionsMap[comment.id!])

            return comment
        } catch (error) {
            return handleServiceError(error)
        }
    }

    deleteComment = async ({ comment_id, user_id }: { comment_id: number; user_id: number }) => {
        try {
            const comment = await Comment.findByPk(comment_id)

            if (!comment) {
                throw new NotFoundError({ message: 'Bình luận không tồn tại' })
            }

            if (comment.user_id !== user_id) {
                throw new ForBiddenError({ message: 'Bạn không có quyền xóa bình luận này' })
            }

            await sequelize.transaction(async (t) => {
                await comment.destroy({ transaction: t })

                await Reaction.destroy({
                    where: { reactionable_id: comment_id, reactionable_type: 'Comment' },
                    transaction: t,
                })
            })

            return
        } catch (error) {
            return handleServiceError(error)
        }
    }
}

export default new CommentService()
