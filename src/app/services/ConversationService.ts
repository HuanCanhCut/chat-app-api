import { Op, QueryTypes } from 'sequelize'

import { AppError, ForBiddenError, InternalServerError } from '../errors/errors'
import { ConversationMember, User } from '../models'
import Conversation from '../models/ConversationModel'
import MessageService from '../services/MessageService'
import { sequelize } from '~/config/database'

class ConversationService {
    async generalConversation({ currentUserId, targetUserId }: { currentUserId: number; targetUserId: number }) {
        try {
            const [conversation] = await sequelize.query(
                `
                    SELECT
                        c.uuid
                    FROM
                        conversation_members cm1
                    JOIN conversation_members cm2 ON cm1.conversation_id = cm2.conversation_id
                    JOIN conversations c ON c.id = cm1.conversation_id
                    WHERE
                        cm1.user_id = :currentUserId
                    AND cm2.user_id = :targetUserId
                    AND c.is_group = 0
                    AND cm1.user_id != cm2.user_id
                    LIMIT 1
                `,
                {
                    type: QueryTypes.SELECT,
                    replacements: {
                        currentUserId,
                        targetUserId,
                    },
                },
            )

            return conversation
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async getConversations({
        currentUserId,
        page,
        per_page,
    }: {
        currentUserId: number
        page: string
        per_page: string
    }) {
        try {
            const conversations = await Conversation.findAll({
                include: [
                    {
                        model: ConversationMember,
                        as: 'conversation_members',
                        include: [
                            {
                                model: User,
                                as: 'user',
                                required: true,
                                attributes: {
                                    exclude: ['password', 'email'],
                                },
                            },
                        ],
                    },
                ],
                where: {
                    id: {
                        [Op.in]: sequelize.literal(`(
                            SELECT conversation_id
                            FROM conversation_members
                            WHERE user_id = ${currentUserId}
                        )`),
                    },
                },
                // Sắp xếp các cuộc trò chuyện theo thời gian của tin nhắn mới nhất
                order: [
                    sequelize.literal(`(
                        SELECT MAX(messages.created_at)
                        FROM messages
                        WHERE messages.conversation_id = Conversation.id
                    ) DESC`), // Sắp xếp theo tin nhắn mới nhất
                ],
                // Lọc chỉ những cuộc trò chuyện có ít nhất 1 tin nhắn
                having: sequelize.literal(`EXISTS (
                    SELECT 1
                    FROM messages
                    WHERE messages.conversation_id = Conversation.id
                )`),
                limit: Number(per_page),
                offset: (Number(page) - 1) * Number(per_page),
            })

            const promises = conversations.map(async (conversation) => {
                const lastMessage = await MessageService.getLastMessage({
                    conversationId: conversation.id as number,
                    currentUserId,
                })

                if (lastMessage) {
                    conversation.dataValues.last_message = lastMessage
                }
            })

            await Promise.all(promises)

            return conversations
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async getConversationByUuid({ currentUserId, uuid }: { currentUserId: number; uuid: string }) {
        try {
            // check if user is a member of the conversation
            const hasMember = await Conversation.findOne({
                attributes: ['id'],
                where: {
                    uuid: uuid,
                },
                include: {
                    model: ConversationMember,
                    as: 'conversation_members',
                    attributes: ['id'],
                    where: {
                        user_id: currentUserId,
                    },
                },
            })

            if (!hasMember) {
                throw new ForBiddenError({ message: 'Permission denied' })
            }

            const conversation = await Conversation.findOne({
                where: {
                    uuid,
                },
                include: [
                    {
                        model: ConversationMember,
                        as: 'conversation_members',
                        required: true,
                        include: [
                            {
                                model: User,
                                as: 'user',
                                attributes: {
                                    exclude: ['password', 'email'],
                                },
                            },
                            {
                                model: User,
                                as: 'added_by',
                                attributes: {
                                    exclude: ['password', 'email'],
                                },
                            },
                        ],
                    },
                ],
            })

            return conversation
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async searchConversation({ currentUserId, q }: { currentUserId: number; q: string }) {
        try {
            const conversations = await Conversation.findAll({
                include: [
                    {
                        model: ConversationMember,
                        as: 'conversation_members',
                        include: [
                            {
                                model: User,
                                as: 'user',
                                required: true,
                                attributes: {
                                    exclude: ['password', 'email'],
                                },
                            },
                        ],
                    },
                ],
                where: {
                    id: {
                        [Op.in]: sequelize.literal(`(
                            SELECT conversation_id
                            FROM conversation_members
                            WHERE user_id = ${currentUserId}
                        )`),
                    },
                    [Op.or]: [
                        {
                            name: {
                                [Op.like]: `%${q}%`,
                            },
                        },
                        sequelize.literal(`
                            Conversation.is_group = 0
                            AND EXISTS (
                                SELECT 1
                                FROM conversation_members
                                JOIN users ON conversation_members.user_id = users.id
                                WHERE conversation_members.conversation_id = Conversation.id
                                AND conversation_members.user_id != ${currentUserId}
                                AND (
                                    (conversation_members.nickname IS NOT NULL AND conversation_members.nickname LIKE ${sequelize.escape(`%${q}%`)})
                                    OR
                                    (conversation_members.nickname IS NULL AND users.full_name LIKE ${sequelize.escape(`%${q}%`)})
                                )
                            )
                        `),
                    ],
                },
                limit: 20,
            })

            return conversations
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }
}

export default new ConversationService()
