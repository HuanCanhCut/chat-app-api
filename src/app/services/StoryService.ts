import { Op } from 'sequelize'

import { ForBiddenError, NotFoundError } from '../errors/errors'
import { Friendships, User } from '../models'
import Reaction from '../models/ReactionModel'
import Story from '../models/StoryModel'
import { handleServiceError } from '../utils/handleServiceError'
import { sequelize } from '~/config/database'
import { redisClient } from '~/config/redis'
import { RedisKey } from '~/enum/redis'
import { BaseReactionUnified } from '~/types/reactionType'

class StoryService {
    createStory = async ({
        currentUserId,
        url,
        type,
        background_url,
    }: {
        currentUserId: number
        url: string
        type: 'image' | 'video' | 'text'
        background_url?: string
    }) => {
        try {
            const story = await Story.create({
                user_id: currentUserId,
                url,
                type,
                background_url,
            })
            return story
        } catch (error) {
            return handleServiceError(error)
        }
    }

    getStories = async ({
        page,
        per_page,
        currentUserId,
    }: {
        page: number
        per_page: number
        currentUserId: number
    }) => {
        try {
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
                    EX: 60 * 5, // 5 minutes
                })
            }

            const { rows: stories, count: total } = await Story.findAndCountAll({
                distinct: true,
                attributes: {
                    include: [
                        [
                            sequelize.literal(`(
                                CASE 
                                    WHEN EXISTS (
                                        SELECT 
                                            (1) 
                                        FROM 
                                            user_viewed_stories 
                                        WHERE 
                                            user_id = ${sequelize.escape(currentUserId)}
                                                AND
                                            story_id = Story.id
                                    ) THEN TRUE 
                                ELSE FALSE 
                                END
                            )`),
                            'is_viewed',
                        ],
                    ],
                },
                include: {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'avatar', 'full_name'],
                },
                where: {
                    user_id: {
                        [Op.in]: [currentUserId, ...friendIds],
                    },
                },
                limit: per_page,
                offset: (page - 1) * per_page,
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

            return {
                stories,
                total: total.reduce((acc: number, curr: { count: number }) => {
                    return acc + curr.count
                }, 0),
            }
        } catch (error) {
            return handleServiceError(error)
        }
    }

    deleteStory = async ({ currentUserId, storyId }: { currentUserId: number; storyId: number }) => {
        try {
            const story = await Story.findByPk(storyId)

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
        storyId,
        unified,
    }: {
        currentUserId: number
        storyId: number
        unified: BaseReactionUnified
    }) => {
        try {
            const story = await Story.findByPk(storyId)

            if (!story) {
                throw new NotFoundError({ message: 'Story not found' })
            }

            const storyReactions = await Reaction.findAll({
                where: {
                    reactionable_type: 'Story',
                    reactionable_id: story.get('id'),
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

            return story
        } catch (error) {
            return handleServiceError(error)
        }
    }
}

export default new StoryService()
