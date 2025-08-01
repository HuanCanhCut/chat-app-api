import got from 'got'
import metascraper from 'metascraper'
import metascraperAuthor from 'metascraper-author'
import metascraperDescription from 'metascraper-description'
import metascraperImage from 'metascraper-image'
import metascraperTitle from 'metascraper-title'
import metascraperUrl from 'metascraper-url'
import { Op, QueryTypes } from 'sequelize'

const scraper = metascraper([
    metascraperDescription(),
    metascraperImage(),
    metascraperTitle(),
    metascraperUrl(),
    metascraperAuthor(),
])

import {
    AppError,
    BadRequestError,
    ForBiddenError,
    InternalServerError,
    NotFoundError,
    UnprocessableEntityError,
} from '../errors/errors'
import { Conversation, Message, MessageStatus, User } from '../models'
import DeletedConversation from '../models/DeletedConversation'
import MessageReaction from '../models/MessageReactionModel'
import ConversationService from './ConversationService'
import SocketMessageService from './SocketMessageService'
import { sequelize } from '~/config/database'
import { redisClient } from '~/config/redis'
import { ioInstance } from '~/config/socket'
import { RedisKey } from '~/enum/redis'
import { SocketEvent } from '~/enum/socketEvent'

class MessageService {
    async createSystemMessage({
        conversationUuid,
        message,
        type,
        currentUserId,
    }: {
        conversationUuid: string
        message: string
        type: string
        currentUserId: number
    }) {
        const socketIds = await redisClient.lRange(`${RedisKey.SOCKET_ID}${currentUserId}`, 0, -1)

        const socket = ioInstance.sockets.sockets.get(socketIds[0])

        const socketMessageService = new SocketMessageService(socket, currentUserId)

        await socketMessageService.NEW_MESSAGE({
            conversation_uuid: conversationUuid,
            message,
            type,
        })
    }

    lastReadMessageIdLiteral = (currentUserId: number, conversationId: number) => {
        return sequelize.literal(`
            (
                SELECT messages.id
                FROM messages
                INNER JOIN message_statuses ON message_statuses.message_id = messages.id
                WHERE messages.type NOT LIKE 'system%' AND message_statuses.receiver_id = message_status.receiver_id AND
                    message_statuses.status = 'read' 
                    AND messages.conversation_id = ${sequelize.escape(conversationId)}
                    AND (
                        message_statuses.is_revoked = 0
                        OR (
                            message_statuses.receiver_id != ${sequelize.escape(currentUserId)}
                            AND message_statuses.revoke_type = 'for-me'
                        )
                        OR (
                            message_statuses.revoke_type = 'for-other'
                        )
                    )
                    AND NOT EXISTS (
                        SELECT 1
                        FROM message_statuses
                        WHERE message_statuses.message_id = messages.id
                        AND message_statuses.is_revoked = 1
                        AND message_statuses.receiver_id = ${sequelize.escape(currentUserId)}
                        AND message_statuses.revoke_type = 'for-me'
                    )
                ORDER BY messages.id DESC
                LIMIT 1
            )
        `)
    }

    isReadLiteral = (currentUserId: number) => {
        return sequelize.literal(`
            CASE 
                WHEN EXISTS (
                    SELECT 1
                    FROM message_statuses
                    WHERE message_statuses.message_id = Message.id
                    AND message_statuses.receiver_id = ${currentUserId}
                    AND message_statuses.status = 'read'
                ) THEN TRUE 
                ELSE FALSE 
            END
        `)
    }

    public async replaceContentAndIsRead(message: Message, currentUserId: number) {
        try {
            const messageId = message.get('id')

            if (messageId) {
                const messageStatuses = (message.get('message_status') as MessageStatus[]) || undefined

                if (Array.isArray(messageStatuses)) {
                    // status of current user
                    const messageStatus = messageStatuses.find((status) => status.get('receiver_id') === currentUserId)

                    if (messageStatus) {
                        if (messageStatus.get('is_revoked')) {
                            message.setDataValue('content', null)
                        }

                        if (messageStatus.get('status') === 'read') {
                            message.setDataValue('is_read', true)
                        }
                    }
                }

                // recursive for parent message
                if (message.get('parent') && message.get('parent_id')) {
                    const parentMessage = message.get('parent') as Message

                    const messageStatuses = await MessageStatus.findAll({
                        where: {
                            message_id: parentMessage.get('id'),
                        },
                    })

                    parentMessage.setDataValue('message_status', messageStatuses)

                    await this.replaceContentAndIsRead(parentMessage, currentUserId)
                }
            }
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async getLastMessage({ conversationUuid, currentUserId }: { conversationUuid: string; currentUserId: number }) {
        try {
            const currentMember = await ConversationService.getMemberInConversation({
                userId: currentUserId,
                conversationUuid,
                currentUserId,
                paranoid: false,
            })

            const lastMessage = await Message.findOne({
                where: {
                    conversation_id: currentMember.conversation_id,
                    [Op.not]: {
                        id: {
                            [Op.in]: sequelize.literal(`
                                (
                                    SELECT message_id
                                    FROM message_statuses
                                    WHERE message_statuses.revoke_type = 'for-me'
                                    AND message_statuses.message_id = Message.id
                                    AND message_statuses.receiver_id = ${sequelize.escape(currentUserId)}
                                )
                            `),
                        },
                    },
                    created_at: {
                        [Op.lte]: currentMember?.get('deleted_at') || new Date(),
                    },
                },
                include: [
                    {
                        model: User,
                        as: 'sender',
                        required: true,
                        attributes: {
                            exclude: ['password', 'email'],
                        },
                    },
                    {
                        model: MessageStatus,
                        as: 'message_status',
                        required: true,
                        include: [
                            {
                                model: User,
                                as: 'receiver',
                                attributes: {
                                    exclude: ['password', 'email'],
                                },
                            },
                        ],
                    },
                ],
                order: [
                    ['created_at', 'DESC'],
                    ['id', 'DESC'],
                ],
            })

            if (lastMessage) {
                await this.replaceContentAndIsRead(lastMessage, currentUserId)
            }

            return lastMessage
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async handleGetMessages({
        conversationUuid,
        currentUserId,
        limit,
        offset,
        sort = 'DESC',
    }: {
        conversationUuid: string
        currentUserId: string
        limit: number
        offset: number
        sort?: 'ASC' | 'DESC'
    }) {
        try {
            const conversation = await ConversationService.userAllowedToConversation({
                userId: Number(currentUserId),
                conversationUuid,
            })

            const removedConversation = await DeletedConversation.findOne({
                where: {
                    user_id: Number(currentUserId),
                    conversation_id: conversation.id,
                },
            })

            const { rows: messages, count } = await Message.findAndCountAll<any>({
                distinct: true,
                include: [
                    {
                        model: MessageStatus,
                        required: true,
                        as: 'message_status',
                        attributes: {
                            include: [
                                [
                                    sequelize.literal(`
                                        CASE 
                                            WHEN 
                                                message_status.receiver_id != ${sequelize.escape(currentUserId)} 
                                                AND message_status.revoke_type = 'for-me' 
                                            THEN 0
                                            ELSE message_status.is_revoked 
                                        END
                                `),
                                    'is_revoked',
                                ],
                                [
                                    sequelize.literal(`
                                        CASE 
                                            WHEN 
                                                message_status.receiver_id != ${sequelize.escape(currentUserId)} 
                                                AND message_status.revoke_type = 'for-me'
                                            THEN NULL
                                            ELSE message_status.revoke_type 
                                        END
                            `),
                                    'revoke_type',
                                ],
                            ],
                        },
                        include: [
                            {
                                model: User,
                                as: 'receiver',
                                attributes: {
                                    include: [
                                        [
                                            this.lastReadMessageIdLiteral(Number(currentUserId), conversation.id!),
                                            'last_read_message_id',
                                        ],
                                    ],
                                    exclude: ['password', 'email'],
                                },
                            },
                        ],
                    },
                    {
                        model: User,
                        as: 'sender',
                        required: true,
                        attributes: {
                            exclude: ['password', 'email'],
                        },
                    },
                    {
                        model: Message,
                        as: 'parent',
                        required: false,
                        where: {
                            // Get all messages except messages that have been revoked for-me by the current user
                            [Op.not]: {
                                id: {
                                    [Op.in]: sequelize.literal(`
                                (
                                    SELECT message_id
                                    FROM message_statuses
                                    WHERE message_statuses.revoke_type = 'for-me'
                                    AND message_statuses.message_id = parent.id
                                    AND message_statuses.receiver_id = ${sequelize.escape(currentUserId)}
                                )
                            `),
                                },
                            },
                        },
                        include: [
                            {
                                model: User,
                                as: 'sender',
                                attributes: { exclude: ['password', 'email'] },
                            },
                        ],
                    },
                ],
                where: {
                    conversation_id: conversation.id,
                    // Get all messages except messages that have been revoked for-me by the current user
                    [Op.not]: {
                        id: {
                            [Op.in]: sequelize.literal(`
                                (
                                    SELECT message_id
                                    FROM message_statuses
                                    WHERE message_statuses.revoke_type = 'for-me'
                                    AND message_statuses.message_id = Message.id
                                    AND message_statuses.receiver_id = ${sequelize.escape(currentUserId)}
                                )
                            `),
                        },
                    },
                    created_at: {
                        [Op.and]: [
                            {
                                [Op.lte]: conversation.members?.[0].deleted_at || new Date(),
                            },
                            {
                                [Op.gte]: removedConversation?.deleted_at || conversation.created_at,
                            },
                        ],
                    },
                },
                limit,
                offset,
                order: [['id', sort]],
            })

            const promises = messages.map(async (message) => {
                const [top_reactions, total_reactions] = await Promise.all([
                    MessageReaction.findAll({
                        where: {
                            message_id: message.id,
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
                        attributes: ['react'],
                        group: ['react'],
                        order: [[sequelize.fn('COUNT', sequelize.col('react')), 'DESC']],
                        limit: 2,
                    }),

                    MessageReaction.count({
                        where: {
                            message_id: message.id,
                        },
                    }),

                    this.replaceContentAndIsRead(message, Number(currentUserId)),
                ])

                if (top_reactions.length > 0) {
                    message.dataValues.top_reactions = top_reactions.map((reaction) => {
                        return {
                            react: reaction.react,
                            user_reaction: reaction.user_reaction,
                        }
                    })
                }

                message.dataValues.total_reactions = total_reactions

                return message
            })

            await Promise.all(promises)

            // Manually set parent to null for messages with for-other revoke type
            for (const message of messages) {
                if (
                    message.message_status &&
                    message.message_status.some(
                        (status: any) => status.is_revoked && status.revoke_type === 'for-other',
                    )
                ) {
                    message.dataValues.parent = null
                }
            }

            return {
                messages,
                count,
            }
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async getMessages({
        conversationUuid,
        currentUserId,
        limit,
        offset,
    }: {
        conversationUuid: string
        currentUserId: string
        limit: number
        offset: number
    }) {
        try {
            const messagesData = await this.handleGetMessages({
                conversationUuid,
                currentUserId: currentUserId,
                limit: Number(limit),
                offset: Number(offset),
            })

            if (!messagesData) {
                throw new ForBiddenError({ message: 'Permission denied' })
            }

            return messagesData
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async getAroundMessages({
        conversationUuid,
        messageId,
        currentUserId,
        limit,
    }: {
        conversationUuid: string
        messageId: number
        currentUserId: number
        limit: number
    }) {
        try {
            const conversation = await Conversation.findOne({
                attributes: ['id'],
                where: {
                    uuid: conversationUuid,
                },
            })

            if (!conversation) {
                throw new NotFoundError({ message: 'Conversation not found' })
            }

            const hasMessage = await Message.findByPk(messageId)

            if (!hasMessage) {
                throw new NotFoundError({ message: 'Message not found' })
            }

            // Tìm vị trí của tin nhắn hiện tại
            const targetMessageIndex = await Message.count({
                where: {
                    id: {
                        [Op.gt]: Number(messageId),
                    },
                    conversation_id: conversation.get('id'),
                },
            })

            // Tính toán số lượng tin nhắn cần lấy trước và sau
            const halfPerPage = Math.floor(Number(limit) / 2)
            const beforeCount = Math.min(halfPerPage, targetMessageIndex)
            const afterCount = Number(limit) - beforeCount - 1 // -1 cho tin nhắn hiện tại

            // Lấy tin nhắn trước, hiện tại và sau cùng lúc bằng Promise.all
            const [beforeMessages, currentMessageData, afterMessages] = await Promise.all([
                targetMessageIndex > 0
                    ? this.handleGetMessages({
                          conversationUuid: conversationUuid,
                          currentUserId: currentUserId.toString(),
                          limit: beforeCount,
                          offset: targetMessageIndex - beforeCount,
                      })
                    : Promise.resolve({ messages: [], count: 0 }),

                this.handleGetMessages({
                    conversationUuid: conversationUuid,
                    currentUserId: currentUserId.toString(),
                    limit: 1,
                    offset: targetMessageIndex,
                }),

                this.handleGetMessages({
                    conversationUuid: conversationUuid,
                    currentUserId: currentUserId.toString(),
                    limit: afterCount,
                    offset: targetMessageIndex + 1,
                }),
            ])

            // Kết hợp và sắp xếp tin nhắn
            const combinedMessages = [
                ...beforeMessages.messages,
                currentMessageData.messages[0],
                ...afterMessages.messages,
            ]

            const totalMessages = beforeMessages.count || afterMessages.count

            return {
                combinedMessages,
                totalMessages,
                beforeCount,
                targetMessageIndex,
            }
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async getMessageImages({
        conversationUuid,
        currentUserId,
        per_page,
        page,
    }: {
        conversationUuid: string
        currentUserId: number
        per_page: number
        page: number
    }) {
        try {
            const conversation = await Conversation.findOne({
                attributes: ['id'],
                where: {
                    uuid: conversationUuid,
                },
            })

            if (!conversation) {
                throw new NotFoundError({ message: 'Conversation not found' })
            }

            const removedConversation = await DeletedConversation.findOne({
                where: {
                    user_id: Number(currentUserId),
                    conversation_id: conversation.id,
                },
            })

            const { rows: messageImages, count } = await Message.findAndCountAll({
                distinct: true,
                where: {
                    type: 'image',
                    conversation_id: conversation.id,
                    [Op.not]: {
                        id: {
                            [Op.in]: sequelize.literal(`
                                (
                                    SELECT message_id 
                                    FROM message_statuses 
                                    WHERE message_statuses.message_id = Message.id 
                                    AND message_statuses.is_revoked = 1
                                    AND message_statuses.receiver_id = ${sequelize.escape(currentUserId)}
                                )
                            `),
                        },
                    },
                    created_at: {
                        [Op.and]: [
                            {
                                [Op.lte]: conversation.members?.[0].deleted_at || new Date(),
                            },
                            {
                                [Op.gte]: removedConversation?.deleted_at || conversation.created_at,
                            },
                        ],
                    },
                },
                limit: Number(per_page),
                offset: (Number(page) - 1) * Number(per_page),
                order: [['id', 'DESC']],
            })

            return {
                messageImages,
                count,
            }
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async getReactions({
        messageId,
        type,
        per_page,
        page,
    }: {
        messageId: number
        type: string
        per_page: number
        page: number
    }) {
        try {
            const { rows: reactions, count } = await MessageReaction.findAndCountAll({
                distinct: true,
                where: {
                    message_id: messageId,
                    ...(type !== 'all' && {
                        react: type as string,
                    }),
                },
                include: [
                    {
                        model: User,
                        as: 'user_reaction',
                        required: true,
                        attributes: {
                            exclude: ['password', 'email'],
                        },
                    },
                ],
                limit: Number(per_page),
                offset: (Number(page) - 1) * Number(per_page),
                order: [['id', 'DESC']],
            })

            return {
                reactions,
                count,
            }
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async getReactionsTypes({ messageId }: { messageId: number }) {
        try {
            const types = await MessageReaction.findAll({
                where: {
                    message_id: messageId,
                },
                attributes: ['react', [sequelize.fn('COUNT', sequelize.col('react')), 'count']],
                group: ['react'],
            })

            return types
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async revokeMessage({
        messageId,
        conversationUuid,
        revokeType,
        currentUserId,
    }: {
        messageId: number
        conversationUuid: string
        revokeType: string
        currentUserId: number
    }) {
        try {
            let updateStatusQuery = ''

            switch (revokeType) {
                case 'for-me':
                    updateStatusQuery = `
                        UPDATE message_statuses
                        JOIN messages ON messages.id = message_statuses.message_id
                        SET message_statuses.is_revoked = 1,
                            message_statuses.revoke_type = :revokeType
                        WHERE message_statuses.message_id = :messageId
                        AND message_statuses.receiver_id = :receiverId
                    `
                    break
                case 'for-other':
                    updateStatusQuery = `
                        UPDATE message_statuses
                        JOIN messages ON messages.id = message_statuses.message_id
                        SET message_statuses.is_revoked = 1,
                            message_statuses.revoke_type = :revokeType
                        WHERE message_statuses.revoke_type IS NULL
                        AND message_statuses.message_id = :messageId
                    `
                    break
                default:
                    break
            }

            if (updateStatusQuery === '') {
                throw new UnprocessableEntityError({
                    message: 'Invalid revoke type, revoke type is for-me or for-other',
                })
            }

            const conversation = await ConversationService.userAllowedToConversation({
                conversationUuid,
                userId: currentUserId,
            })

            if (!conversation) {
                throw new ForBiddenError({ message: 'Permission denied' })
            }

            const message = await Message.findByPk(messageId)

            const removedConversation = await DeletedConversation.findOne({
                where: {
                    user_id: currentUserId,
                    conversation_id: conversation.id,
                },
            })

            if (message && removedConversation) {
                if (message.get('created_at')! < removedConversation.get('deleted_at')!) {
                    throw new UnprocessableEntityError({ message: 'Message not found or already revoked' })
                }
            }

            const [, metadata] = await sequelize.query(updateStatusQuery, {
                replacements: {
                    revokeType,
                    messageId,
                    receiverId: currentUserId,
                },
                type: QueryTypes.UPDATE,
            })

            if (metadata === 0) {
                throw new UnprocessableEntityError({ message: 'Message not found or already revoked' })
            }

            if (revokeType === 'for-other') {
                ioInstance.to(conversationUuid).emit(SocketEvent.MESSAGE_REVOKE, {
                    message_id: messageId,
                    conversation_uuid: conversationUuid,
                })
            }
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async searchMessages({
        q,
        conversationUuid,
        currentUserId,
        page,
        perPage,
    }: {
        q: string
        conversationUuid: string
        currentUserId: number
        page: number
        perPage: number
    }) {
        try {
            const conversation = await ConversationService.userAllowedToConversation({
                conversationUuid,
                userId: currentUserId,
            })

            const removedConversation = await DeletedConversation.findOne({
                where: {
                    user_id: currentUserId,
                    conversation_id: conversation.id,
                },
            })

            if (!conversation) {
                throw new ForBiddenError({ message: 'Permission denied' })
            }

            const { rows: messages, count } = await Message.findAndCountAll({
                distinct: true,
                include: [
                    {
                        model: MessageStatus,
                        as: 'message_status',
                        required: true,
                    },
                    {
                        model: User,
                        as: 'sender',
                        required: true,
                        attributes: {
                            exclude: ['password', 'email'],
                        },
                    },
                ],
                where: {
                    conversation_id: conversation?.get('id'),
                    [Op.not]: {
                        id: {
                            [Op.in]: sequelize.literal(`
                                (
                                    SELECT message_id
                                    FROM message_statuses
                                    WHERE message_statuses.message_id = Message.id  AND ((
                                        message_statuses.revoke_type = 'for-me'
                                        AND message_statuses.receiver_id = ${sequelize.escape(currentUserId)}
                                    ) OR message_statuses.revoke_type = 'for-other')
                                )
                            `),
                        },
                    },
                    type: 'text',
                    [Op.and]: [
                        sequelize.literal(`MATCH(content) AGAINST(${sequelize.escape(q + '*')} IN BOOLEAN MODE)`),
                    ],
                    created_at: {
                        [Op.and]: [
                            {
                                [Op.lte]: conversation.members?.[0].deleted_at || new Date(),
                            },
                            {
                                [Op.gte]: removedConversation?.deleted_at || conversation.created_at,
                            },
                        ],
                    },
                },
                limit: Number(perPage),
                offset: (Number(page) - 1) * Number(perPage),
                order: [['id', 'DESC']],
            })

            return {
                messages,
                count,
            }
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async getLinkPreviews(urls: string[], options?: { maxConcurrency?: number }) {
        try {
            const { maxConcurrency = 5 } = options || {}

            const isValidUrl = (url: string) => {
                try {
                    new URL(url)
                    return true
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                } catch (_) {
                    return false
                }
            }

            // Validate all URLs first
            const validUrls: string[] = []
            const invalidUrls: string[] = []

            urls.forEach((url) => {
                if (!url || !isValidUrl(url)) {
                    invalidUrls.push(url)
                } else {
                    validUrls.push(url)
                }
            })

            if (invalidUrls.length > 0) {
                console.warn('Invalid URLs found:', invalidUrls)
            }

            if (validUrls.length === 0 && urls.length > 0) {
                throw new BadRequestError({ message: 'No valid URLs provided' })
            }

            // Process URLs in batches with concurrency limit
            const results = await this.processBatchWithConcurrency(
                validUrls,
                this.getSingleLinkPreview.bind(this),
                maxConcurrency,
            )

            // Combine results with original URLs (including invalid ones)
            const finalResults = urls.map((originalUrl) => {
                if (invalidUrls.includes(originalUrl)) {
                    return {
                        url: originalUrl,
                        success: false,
                        error: 'Invalid URL format',
                    }
                }

                const result = results.find((r) => r.originalUrl === originalUrl)

                return (
                    result || {
                        url: originalUrl,
                        success: false,
                        error: 'Unknown error',
                    }
                )
            })

            return {
                total: urls.length,
                successful: finalResults.filter((r) => r.success).length,
                failed: finalResults.filter((r) => !r.success).length,
                invalidUrls,
                results: finalResults,
            }
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }
            throw new InternalServerError({ message: error.message })
        }
    }

    private async processBatchWithConcurrency<T, R>(
        items: T[],
        processor: (item: T) => Promise<R>,
        maxConcurrency: number,
    ): Promise<R[]> {
        const results: R[] = []

        // Process in chunks
        for (let i = 0; i < items.length; i += maxConcurrency) {
            const chunk = items.slice(i, i + maxConcurrency)

            // Process chunk concurrently
            const chunkPromises = chunk.map((item) =>
                processor(item).catch(
                    (error) =>
                        ({
                            originalUrl: item,
                            success: false,
                            error: error.message || 'Processing failed',
                        }) as R,
                ),
            )

            const chunkResults = await Promise.all(chunkPromises)
            results.push(...chunkResults)
        }

        return results
    }

    private async getSingleLinkPreview(url: string) {
        try {
            // Check cache first
            const cacheKey = url

            const cached = await redisClient.get(cacheKey)

            if (cached) {
                return {
                    ...JSON.parse(cached),
                    originalUrl: url,
                }
            }

            // Fetch và parse metadata
            const { body: html, url: targetUrl } = await got(url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; LinkPreview/1.0)',
                },
            })

            const metadata = await scraper({ html, url: targetUrl })

            const result = {
                originalUrl: url,
                title: metadata.title || null,
                description: metadata.description || null,
                image: metadata.image || null,
                url: metadata.url || url,
                author: metadata.author || null,
                success: true,
            }

            await redisClient.set(cacheKey, JSON.stringify(result), { EX: 60 * 60 * 24 })

            return result
        } catch (error: any) {
            return {
                originalUrl: url,
                success: false,
                error: error.message || 'Failed to fetch preview',
                title: null,
                description: null,
                image: null,
                url: url,
                author: null,
            }
        }
    }

    async getLinks({
        conversationUuid,
        page,
        perPage,
        currentUserId,
    }: {
        conversationUuid: string
        page: number
        perPage: number
        currentUserId: number
    }) {
        try {
            const conversation = await ConversationService.userAllowedToConversation({
                conversationUuid,
                userId: currentUserId,
            })

            const removedConversation = await DeletedConversation.findOne({
                where: {
                    user_id: currentUserId,
                    conversation_id: conversation.id,
                },
            })

            const { rows: links, count } = await Message.findAndCountAll({
                where: {
                    conversation_id: conversation.id,
                    type: 'text',
                    [Op.and]: [sequelize.literal(`MATCH(content) AGAINST('http*' IN BOOLEAN MODE)`)],
                    [Op.not]: {
                        id: {
                            [Op.in]: sequelize.literal(`
                                (
                                    SELECT message_id 
                                    FROM message_statuses 
                                    WHERE message_statuses.message_id = Message.id 
                                    AND message_statuses.is_revoked = 1
                                    AND message_statuses.receiver_id = ${sequelize.escape(currentUserId)}
                                )
                            `),
                        },
                    },
                    created_at: {
                        [Op.and]: [
                            {
                                [Op.lte]: conversation.members?.[0].deleted_at || new Date(),
                            },
                            {
                                [Op.gte]: removedConversation?.deleted_at || conversation.created_at,
                            },
                        ],
                    },
                },
                limit: perPage,
                offset: (page - 1) * perPage,
                order: [['id', 'DESC']],
            })

            const extractUrls = (text: string) => {
                const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi
                const matches = text.match(urlRegex)
                return matches ? [...new Set(matches)] : []
            }

            const urls = []

            for (const link of links) {
                if (link.content) {
                    const url = extractUrls(link.content)
                    urls.push(...url)
                }
            }

            const linkPreviews = await this.getLinkPreviews(urls)

            return {
                linkPreviews,
                count,
            }
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }
}

export default new MessageService()
