import { Op } from 'sequelize'

import { ForBiddenError, NotFoundError } from '../errors/errors'
import { Friendships, User } from '../models'
import Reaction from '../models/ReactionModel'
import Story from '../models/StoryModel'
import UserViewedStory from '../models/UserViewedStoryModel'
import { decodeCursor, encodeCursor } from '../utils/cursor'
import { handleServiceError } from '../utils/handleServiceError'
import { LastIdType } from '../validator/api/common'
import NotificationService from './NotificationService'
import { sequelize } from '~/config/database'
import { redisClient } from '~/config/redis'
import { ioInstance } from '~/config/socket'
import { RedisKey } from '~/enum/redis'
import { BaseReactionUnified } from '~/types/reactionType'

class StoryService {
    createStory = async ({
        currentUserId,
        url,
        type,
        caption,
    }: {
        currentUserId: number
        url: string
        type: 'image' | 'video' | 'text'
        caption?: string
    }) => {
        try {
            const story = await Story.create({
                user_id: currentUserId,
                url,
                type,
                background_url: type === 'text' ? url : undefined,
                caption,
            })
            return story
        } catch (error) {
            return handleServiceError(error)
        }
    }

    getStories = async ({
        cursor,
        limit,
        currentUserId,
    }: {
        cursor?: string
        limit: number
        currentUserId: number
    }) => {
        try {
            const { last_id: cursorId } = decodeCursor<LastIdType>(cursor) ?? {}

            let friendIds: number[] = []

            const friendIdsCache = await redisClient.get(`${RedisKey.FRIENDS_IDS_OF_USER}${currentUserId}`)

            if (friendIdsCache) {
                friendIds = JSON.parse(friendIdsCache)
            } else {
                const friends = await Friendships.findAll({
                    where: {
                        status: 'accepted',
                        [Op.or]: [{ user_id: currentUserId }, { friend_id: currentUserId }],
                    },
                    attributes: ['friend_id', 'user_id'],
                })

                friendIds = friends.map((friend) =>
                    friend.user_id === currentUserId ? friend.friend_id : friend.user_id,
                )

                await redisClient.set(`${RedisKey.FRIENDS_IDS_OF_USER}${currentUserId}`, JSON.stringify(friendIds), {
                    EX: 60 * 4, // 4 minutes
                })
            }

            const whereClause: Record<string, unknown> = {
                user_id: {
                    [Op.in]: [currentUserId, ...friendIds],
                },
            }

            if (cursorId) {
                whereClause.id = {
                    [Op.lt]: cursorId,
                }
            }

            const stories = await Story.findAll({
                attributes: {
                    include: [
                        [
                            sequelize.literal(`(
                                CASE 
                                    WHEN EXISTS (
                                        SELECT 1 
                                        FROM user_viewed_stories 
                                        WHERE user_id = ${sequelize.escape(currentUserId)}
                                            AND story_id = (
                                                SELECT id
                                                FROM stories s
                                                WHERE s.user_id = Story.user_id
                                                ORDER BY s.id DESC
                                                LIMIT 1
                                            )
                                    ) THEN TRUE 
                                ELSE FALSE 
                                END
                            )`),
                            'is_viewed',
                        ],
                        [
                            sequelize.literal(`(
                                SELECT COUNT(1) 
                                FROM stories
                                WHERE stories.user_id = Story.user_id
                                    AND NOT EXISTS (
                                        SELECT 1 
                                        FROM user_viewed_stories
                                        WHERE user_viewed_stories.user_id = ${sequelize.escape(currentUserId)}
                                            AND user_viewed_stories.story_id = stories.id
                                    )
                            )`),
                            'unviewed_count',
                        ],
                    ],
                },
                include: {
                    model: User,
                    as: 'user',
                },
                where: whereClause,
                limit: limit + 1,
                order: [
                    [
                        sequelize.literal(
                            `CASE 
                                WHEN 
                                    Story.user_id = ${sequelize.escape(currentUserId)} 
                                THEN 0 
                                ELSE 1 
                            END`,
                        ),
                        'ASC',
                    ],
                    ['is_viewed', 'ASC'],
                    ['id', 'DESC'],
                ],
                group: ['Story.user_id'],
            })

            const hasNext = stories.length > limit
            const paginatedStories = hasNext ? stories.slice(0, limit) : stories

            const nextCursor = hasNext
                ? encodeCursor<LastIdType>({ last_id: paginatedStories[paginatedStories.length - 1].id! })
                : null

            return {
                stories: paginatedStories,
                next_cursor: nextCursor,
            }
        } catch (error) {
            return handleServiceError(error)
        }
    }

    deleteStory = async ({ currentUserId, storyUuid }: { currentUserId: number; storyUuid: string }) => {
        try {
            const story = await Story.findOne({ where: { uuid: storyUuid } })

            if (!story) {
                throw new NotFoundError({ message: 'Story not found' })
            }

            if (story.user_id !== currentUserId) {
                throw new ForBiddenError({ message: 'You are not permitted to delete this story' })
            }

            await story.destroy()
        } catch (error) {
            return handleServiceError(error)
        }
    }

    reactToStory = async ({
        currentUserId,
        storyUuid,
        unified,
    }: {
        currentUserId: number
        storyUuid: string
        unified: BaseReactionUnified
    }) => {
        try {
            const story = await Story.findOne({
                where: {
                    uuid: storyUuid,
                },
            })

            if (!story) {
                throw new NotFoundError({ message: 'Story not found' })
            }

            const storyReactions = await Reaction.findAll({
                where: {
                    reactionable_type: 'Story',
                    reactionable_id: story.get('id'),
                    user_id: currentUserId,
                },
            })

            if (storyReactions.length === 0) {
                // First reaction, create it
                await Reaction.create({
                    user_id: currentUserId,
                    reactionable_type: 'Story',
                    reactionable_id: story.get('id')!,
                    react: unified,
                })

                const notification = await NotificationService.create({
                    recipientId: story.user_id,
                    type: 'reaction',
                    currentUserId,
                    target_type: 'Story',
                    target_id: story.get('id')!,
                    metadata: JSON.stringify({
                        reaction: unified,
                    }),
                    message: '{actor} đã thả cảm xúc story của bạn',
                })

                if (notification && story.user_id !== currentUserId) {
                    const socketIds = await redisClient.lRange(`${RedisKey.SOCKET_ID}${Number(story.user_id)}`, 0, -1)

                    if (socketIds.length > 0) {
                        ioInstance.to(socketIds).emit('NEW_NOTIFICATION', {
                            notification,
                        })
                    }
                }
            } else {
                const MAX_REACTION_COUNT = 5

                if (storyReactions.length < MAX_REACTION_COUNT) {
                    // Add new reaction
                    await Reaction.create({
                        user_id: currentUserId,
                        reactionable_type: 'Story',
                        reactionable_id: story.get('id')!,
                        react: unified,
                    })
                } else {
                    // remove first reaction and insert new one
                    await Promise.all([
                        Reaction.destroy({
                            where: {
                                id: storyReactions[0].get('id'),
                            },
                        }),
                        Reaction.create({
                            user_id: currentUserId,
                            reactionable_type: 'Story',
                            reactionable_id: story.get('id')!,
                            react: unified,
                        }),
                    ])
                }
            }

            const reactions = await Reaction.findAll({
                where: {
                    reactionable_type: 'Story',
                    reactionable_id: story.get('id')!,
                    user_id: currentUserId,
                },
            })

            return reactions
        } catch (error) {
            return handleServiceError(error)
        }
    }

    removeStoryReacts = async ({ currentUserId, storyUuid }: { currentUserId: number; storyUuid: string }) => {
        try {
            const story = await Story.findOne({
                where: {
                    uuid: storyUuid,
                },
            })
            if (!story) {
                throw new NotFoundError({ message: 'Story not found' })
            }

            await Reaction.destroy({
                where: {
                    user_id: currentUserId,
                    reactionable_type: 'Story',
                    reactionable_id: story.get('id'),
                },
            })

            return story
        } catch (error) {
            return handleServiceError(error)
        }
    }

    getUserStories = async ({ uuid, currentUserId }: { uuid: string; currentUserId: number }) => {
        try {
            const story = await Story.findOne({
                where: {
                    uuid,
                },
                attributes: ['user_id'],
            })

            if (!story) {
                throw new NotFoundError({ message: 'Story not found' })
            }

            const stories = await Story.findAll({
                where: {
                    user_id: story.get('user_id'),
                },
                include: [
                    {
                        model: User,
                        as: 'user',
                    },
                    {
                        model: Reaction,
                        as: 'reactions',
                        where: {
                            user_id: currentUserId,
                        },
                        required: false,
                    },
                ],
                attributes: {
                    include: [
                        [
                            sequelize.literal(`(
                                CASE 
                                    WHEN EXISTS (
                                        SELECT 1 
                                        FROM user_viewed_stories 
                                        WHERE user_id = ${sequelize.escape(currentUserId)}
                                            AND story_id = Story.id
                                    ) THEN TRUE 
                                ELSE FALSE 
                                END
                            )`),
                            'is_viewed',
                        ],
                    ],
                },
            })

            return stories
        } catch (error) {
            return handleServiceError(error)
        }
    }

    viewStory = async ({ currentUserId, storyUuid }: { currentUserId: number; storyUuid: string }) => {
        try {
            const story = await Story.findOne({
                where: {
                    uuid: storyUuid,
                },
            })

            if (!story) {
                throw new NotFoundError({ message: 'Story not found' })
            }

            const userViewedStory = await UserViewedStory.findOne({
                where: {
                    user_id: currentUserId,
                    story_id: story.get('id')!,
                },
            })

            if (!userViewedStory) {
                await UserViewedStory.create({
                    user_id: currentUserId,
                    story_id: story.get('id')!,
                })
            }
        } catch (error) {
            return handleServiceError(error)
        }
    }

    getUserViewedStories = async ({
        storyUuid,
        page,
        per_page,
        currentUserId,
    }: {
        storyUuid: string
        page: number
        per_page: number
        currentUserId: number
    }) => {
        try {
            const story = await Story.findOne({
                where: {
                    uuid: storyUuid,
                },
                attributes: ['user_id', 'id'],
            })

            if (!story) {
                throw new NotFoundError({ message: 'Story not found' })
            }

            if (story.get('user_id') !== currentUserId) {
                throw new ForBiddenError({ message: 'You are not authorized to view this story' })
            }

            const { rows: userViewedStories, count: total } = await UserViewedStory.findAndCountAll({
                distinct: true,
                where: {
                    story_id: story.get('id')!,
                    user_id: {
                        [Op.ne]: currentUserId,
                    },
                },
                include: [
                    {
                        model: User,
                        as: 'user',
                        include: [
                            {
                                model: Reaction,
                                as: 'reactions',
                                where: {
                                    reactionable_type: 'Story',
                                    reactionable_id: story.get('id')!,
                                },
                                required: false,
                            },
                        ],
                    },
                ],
                limit: per_page,
                offset: (page - 1) * per_page,
                order: [
                    [
                        sequelize.literal(`(
                            SELECT COUNT(1) 
                            FROM reactions 
                            WHERE reactions.reactionable_id = UserViewedStory.story_id
                            AND reactions.reactionable_type = 'Story'
                        )`),
                        'DESC',
                    ],
                ],
            })

            return { userViewedStories, total }
        } catch (error) {
            return handleServiceError(error)
        }
    }
}

export default new StoryService()
