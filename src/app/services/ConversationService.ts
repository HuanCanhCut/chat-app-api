import { Op, QueryTypes } from 'sequelize'

import { AppError, ConflictError, ForBiddenError, InternalServerError, NotFoundError } from '../errors/errors'
import uploadSingleFile from '../helper/uploadToCloudinary'
import { Block, Conversation, ConversationMember, ConversationTheme, User } from '../models'
import DeletedConversation from '../models/DeletedConversation'
import { addSystemMessageJob } from '../queue/systemMessage'
import MessageService from '../services/MessageService'
import { sequelize } from '~/config/database'
import { redisClient } from '~/config/redis'
import { ioInstance } from '~/config/socket'
import { RedisKey } from '~/enum/redis'
import { SocketEvent } from '~/enum/socketEvent'

class ConversationService {
    async userAllowedToConversation({
        userId,
        conversationUuid,
        paranoid = true,
    }: {
        userId: number
        conversationUuid: string
        paranoid?: boolean
    }) {
        // check if user is a member of the conversation
        const conversation = await Conversation.findOne({
            where: {
                uuid: conversationUuid,
            },
            include: {
                model: ConversationMember,
                as: 'members',
                include: [
                    {
                        model: User,
                        as: 'user',
                    },
                ],
                where: {
                    user_id: userId,
                },
                paranoid,
            },
            logging: console.log,
        })

        if (!conversation) {
            throw new ForBiddenError({ message: 'You are not allowed to access this conversation' })
        }

        return conversation
    }

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
            const { rows: conversations, count } = await Conversation.findAndCountAll({
                distinct: true,
                include: [
                    {
                        model: ConversationMember,
                        as: 'members',
                        include: [
                            {
                                model: User,
                                as: 'user',
                                required: true,
                                attributes: {
                                    exclude: ['password', 'email'],
                                },
                                runHooks: true,
                            },
                        ],
                    },
                ],
                where: {
                    id: {
                        [Op.in]: sequelize.literal(`(
                            SELECT DISTINCT conversation_id
                            FROM conversation_members
                            WHERE user_id = ${currentUserId}
                            AND (deleted_type IS NULL OR deleted_type = 'removed')
                        )`),
                    },
                    [Op.and]: sequelize.literal(`EXISTS (
                        SELECT 1
                        FROM messages
                        WHERE messages.conversation_id = \`Conversation\`.\`id\`
                        AND messages.created_at > COALESCE((
                            SELECT deleted_at
                            FROM deleted_conversations
                            WHERE user_id = ${sequelize.escape(currentUserId)} AND conversation_id = \`Conversation\`.\`id\`
                        ), '1970-01-01')
                    )`),
                },
                order: [
                    sequelize.literal(`(
                        SELECT MAX(messages.created_at)
                        FROM messages
                        WHERE messages.conversation_id = Conversation.id
                    ) DESC`),
                ],
                limit: Number(per_page),
                offset: (Number(page) - 1) * Number(per_page),
                logging: console.log,
            })

            const promises = conversations.map(async (conversation) => {
                const lastMessage = await MessageService.getLastMessage({
                    conversationUuid: conversation.uuid,
                    currentUserId,
                })

                if (lastMessage) {
                    conversation.dataValues.last_message = lastMessage
                }
            })

            await Promise.all(promises)

            return { conversations, count }
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async getConversationByUuid({ currentUserId, uuid }: { currentUserId: number; uuid: string }) {
        try {
            const allowedConversation = await this.userAllowedToConversation({
                userId: currentUserId,
                conversationUuid: uuid,
                paranoid: false,
            })

            const conversation = await Conversation.findByPk(allowedConversation.id, {
                include: [
                    {
                        model: ConversationMember,
                        as: 'members',
                        required: true,
                        include: [
                            {
                                model: User,
                                as: 'user',
                                attributes: {
                                    exclude: ['password', 'email'],
                                },
                                runHooks: true,
                            },
                            {
                                model: User,
                                as: 'added_by',
                                attributes: {
                                    exclude: ['password', 'email'],
                                },
                                runHooks: true,
                            },
                        ],
                    },
                    {
                        model: ConversationTheme,
                        as: 'theme',
                    },
                    {
                        model: Block,
                        as: 'block_conversation',
                        include: [
                            {
                                model: User,
                                as: 'blocker',
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
                        as: 'members',
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

    async renameConversation({
        currentUserId,
        conversationUuid,
        conversationName,
    }: {
        currentUserId: number
        conversationUuid: string
        conversationName: string
    }) {
        try {
            const conversation = await this.userAllowedToConversation({
                userId: currentUserId,
                conversationUuid: conversationUuid,
            })

            if (!conversation.is_group) {
                throw new ForBiddenError({ message: 'You are not allowed to rename a personal conversation' })
            }

            conversation.name = conversationName
            const savedConversation = await conversation.save()

            if (!savedConversation) {
                throw new InternalServerError({ message: 'Failed to rename conversation' })
            }

            ioInstance.to(conversationUuid).emit(SocketEvent.CONVERSATION_RENAMED, {
                conversation_uuid: conversationUuid,
                key: 'name',
                value: conversationName,
            })

            await addSystemMessageJob({
                conversationUuid,
                message: `${JSON.stringify({
                    user_id: currentUserId,
                    name: conversation.members![0].nickname || conversation.members![0].user?.full_name,
                })} đã đổi tên đoạn chat thành ${conversationName}.`,
                type: 'system_change_group_name',
                currentUserId,
            })

            delete savedConversation.dataValues.members

            return savedConversation
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async changeConversationAvatar({
        currentUserId,
        conversationUuid,
        avatar,
    }: {
        currentUserId: number
        conversationUuid: string
        avatar: Express.Multer.File
    }) {
        try {
            const conversation = await this.userAllowedToConversation({
                userId: currentUserId,
                conversationUuid: conversationUuid,
            })

            if (!conversation.is_group) {
                throw new ForBiddenError({
                    message: 'You are not allowed to change the avatar of a personal conversation',
                })
            }

            const { result } = await uploadSingleFile({
                file: avatar,
                folder: 'conversations',
                publicId: conversation.uuid,
                type: 'avatar',
            })

            if (!result) {
                throw new InternalServerError({ message: 'Failed to upload avatar' })
            }

            conversation.avatar = result?.secure_url
            const savedConversation = await conversation.save()

            if (!savedConversation) {
                throw new InternalServerError({ message: 'Failed to change conversation avatar' })
            }

            ioInstance.to(conversationUuid).emit(SocketEvent.CONVERSATION_AVATAR_CHANGED, {
                conversation_uuid: conversationUuid,
                key: 'avatar',
                value: result?.secure_url,
            })

            await addSystemMessageJob({
                conversationUuid,
                message: `${JSON.stringify({
                    user_id: currentUserId,
                    name: conversation.members![0].nickname || conversation.members![0].user?.full_name,
                })} đã đổi ảnh nhóm.`,
                type: 'system_change_group_avatar',
                currentUserId,
            })

            delete conversation.dataValues.members

            return conversation
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async changeConversationTheme({
        currentUserId,
        conversationUuid,
        themeId,
    }: {
        currentUserId: number
        conversationUuid: string
        themeId: number
    }) {
        try {
            const conversation = await this.userAllowedToConversation({
                userId: currentUserId,
                conversationUuid: conversationUuid,
            })

            const theme = await ConversationTheme.findByPk(themeId)

            if (!theme) {
                throw new NotFoundError({ message: 'Theme not found' })
            }

            conversation.theme_id = themeId

            if (theme.emoji) {
                conversation.emoji = theme.emoji
            }

            const savedConversation = await conversation.save()

            if (!savedConversation) {
                throw new InternalServerError({ message: 'Failed to change conversation theme' })
            }

            ioInstance.to(conversationUuid).emit(SocketEvent.CONVERSATION_THEME_CHANGED, {
                conversation_uuid: conversationUuid,
                key: 'theme',
                value: theme,
            })

            ioInstance.to(conversationUuid).emit(SocketEvent.CONVERSATION_EMOJI_CHANGED, {
                conversation_uuid: conversationUuid,
                key: 'emoji',
                value: theme.emoji,
            })

            let emoji = ''

            if (theme.emoji) {
                // convert unified to emoji
                emoji = String.fromCodePoint(parseInt(theme.emoji, 16))
            }

            await addSystemMessageJob({
                conversationUuid,
                message: `${JSON.stringify({
                    user_id: currentUserId,
                    name: conversation.members![0].nickname || conversation.members![0].user?.full_name,
                })} đã đổi chủ đề thành ${theme.name} ${emoji ? emoji : ''}`,
                type: 'system_change_theme',
                currentUserId,
            })

            delete savedConversation.dataValues.members

            return savedConversation
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async changeConversationEmoji({
        currentUserId,
        conversationUuid,
        emoji,
    }: {
        currentUserId: number
        conversationUuid: string
        emoji: string
    }) {
        try {
            const conversation = await this.userAllowedToConversation({
                userId: currentUserId,
                conversationUuid: conversationUuid,
            })

            // convert emoji to unified
            const unifiedEmoji = emoji.codePointAt(0)?.toString(16)

            conversation.emoji = unifiedEmoji
            const savedConversation = await conversation.save()

            if (!savedConversation) {
                throw new InternalServerError({ message: 'Failed to change conversation emoji' })
            }

            ioInstance.to(conversationUuid).emit(SocketEvent.CONVERSATION_EMOJI_CHANGED, {
                conversation_uuid: conversationUuid,
                key: 'emoji',
                value: unifiedEmoji,
            })

            await addSystemMessageJob({
                conversationUuid,
                message: `${JSON.stringify({
                    user_id: currentUserId,
                    name: conversation.members![0].nickname || conversation.members![0].user?.full_name,
                })} đã đặt cảm xúc nhanh thành ${emoji}.`,
                type: 'system_change_emoji',
                currentUserId,
            })

            delete savedConversation.dataValues.members

            return savedConversation
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async changeConversationMemberNickname({
        currentUserId,
        conversationUuid,
        nickname,
        userId,
    }: {
        currentUserId: number
        conversationUuid: string
        nickname: string
        userId: number
    }) {
        try {
            const conversation = await this.userAllowedToConversation({
                userId: currentUserId,
                conversationUuid: conversationUuid,
            })

            const [member, user] = await Promise.all([
                await ConversationMember.findOne({
                    include: [
                        {
                            model: Conversation,
                            as: 'conversation',
                            where: {
                                uuid: conversationUuid,
                            },
                        },
                    ],
                    where: {
                        user_id: userId,
                    },
                }),

                User.findByPk(userId, {
                    attributes: {
                        include: ['full_name'],
                    },
                }),
            ])

            if (!member) {
                throw new NotFoundError({ message: 'Member is not in this conversation' })
            }

            member.nickname = nickname.trim().length ? nickname : null
            const savedMember = await member.save()

            if (!savedMember) {
                throw new InternalServerError({ message: 'Failed to change conversation member nickname' })
            }

            ioInstance.to(conversationUuid).emit(SocketEvent.CONVERSATION_MEMBER_NICKNAME_CHANGED, {
                conversation_uuid: conversationUuid,
                user_id: userId,
                key: 'nickname',
                value: nickname,
            })

            await addSystemMessageJob({
                conversationUuid,
                message: `${JSON.stringify({
                    user_id: currentUserId,
                    name: conversation.members![0].nickname || conversation.members![0].user?.full_name,
                })} đã ${nickname.trim().length ? 'đặt biệt danh cho' : 'xóa biệt danh của'} ${JSON.stringify({
                    user_id: userId,
                    name: user?.full_name,
                })} ${nickname.trim().length ? `thành ${nickname}` : ''}.`,
                type: 'system_set_nickname',
                currentUserId,
            })

            return savedMember
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async addUserToConversation({
        currentUserId,
        conversationUuid,
        userIds,
    }: {
        currentUserId: number
        conversationUuid: string
        userIds: number[]
    }) {
        try {
            const conversation = await this.userAllowedToConversation({
                userId: currentUserId,
                conversationUuid: conversationUuid,
            })

            if (!conversation.is_group) {
                throw new ForBiddenError({ message: 'You are not allowed to add a user to a personal conversation' })
            }

            const [users, hasMemberInConversations] = await Promise.all([
                Promise.all(
                    userIds.map(async (userId) => {
                        return User.findByPk(userId, {
                            attributes: {
                                include: ['full_name'],
                            },
                        })
                    }),
                ),
                Promise.all(
                    userIds.map(async (userId) => {
                        return await ConversationMember.findOne({
                            where: {
                                conversation_id: conversation.id,
                                user_id: userId,
                            },
                            include: [
                                {
                                    model: User,
                                    as: 'user',
                                    attributes: {
                                        exclude: ['password', 'email'],
                                    },
                                },
                            ],
                            paranoid: false,
                        })
                    }),
                ),
            ])

            const notFoundUserIds = userIds.filter((userId) => !users.some((user) => user?.get('id') === userId))

            if (notFoundUserIds.length > 0) {
                throw new NotFoundError({ message: `User ${notFoundUserIds.join(', ')} not found` })
            }

            if (hasMemberInConversations.length > 0) {
                const hasMembers = hasMemberInConversations.filter((member) => {
                    return member && !member?.get('deleted_at')
                })

                if (hasMembers.length > 0) {
                    throw new ConflictError({
                        message: `${hasMembers.map((member) => member?.user?.full_name).join(', ')} is already in this conversation`,
                    })
                }

                // if member is deleted, we need to delete it before add new members
                const deletedMembers = hasMemberInConversations.filter((member) => {
                    return member && member?.get('deleted_at')
                })

                await ConversationMember.destroy({
                    where: {
                        id: {
                            [Op.in]: deletedMembers.map((member) => member?.get('id') || 0),
                        },
                    },
                    force: true,
                })
            }

            const conversationMembers = await ConversationMember.bulkCreate(
                userIds.map((userId) => ({
                    conversation_id: conversation.id,
                    user_id: userId,
                    added_by_id: currentUserId,
                    role: 'member' as 'admin' | 'leader' | 'member',
                })),
            )

            if (!conversationMembers) {
                throw new InternalServerError({ message: 'Failed to add user to conversation' })
            }

            const members = await Promise.all(
                conversationMembers.map((member) => {
                    return ConversationMember.findByPk(member.get('id'), {
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
                    })
                }),
            )

            ioInstance.to(conversationUuid).emit(SocketEvent.CONVERSATION_MEMBER_ADDED, {
                conversation_uuid: conversationUuid,
                members,
            })

            // emit event to new members

            for (const member of members) {
                if (member) {
                    const socketIds = await redisClient.lRange(
                        `${RedisKey.SOCKET_ID}${Number(member.get('user_id'))}`,
                        0,
                        -1,
                    )

                    if (socketIds && socketIds.length > 0) {
                        ioInstance.to(socketIds).emit(SocketEvent.CONVERSATION_MEMBER_JOINED)
                    }
                }
            }

            await Promise.all(
                members.map((member) => {
                    if (!member) {
                        return
                    }

                    return addSystemMessageJob({
                        conversationUuid: conversation.uuid,
                        message: `${JSON.stringify({
                            user_id: currentUserId,
                            name: conversation.members![0].nickname || conversation.members![0].user?.full_name,
                        })} đã thêm ${JSON.stringify({
                            user_id: member.get('user_id'),
                            name: member.get('user')?.get('full_name'),
                        })} vào nhóm.`,
                        type: 'system_add_user',
                        currentUserId,
                    })
                }),
            )

            return members
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async getMemberInConversation({
        userId,
        conversationUuid,
        currentUserId,
        paranoid = true,
    }: {
        userId: number
        conversationUuid: string
        currentUserId: number
        paranoid?: boolean
    }) {
        try {
            const conversation = await this.userAllowedToConversation({
                userId: currentUserId,
                conversationUuid: conversationUuid,
                paranoid,
            })

            const member = await ConversationMember.findOne({
                where: {
                    conversation_id: conversation.get('id'),
                    user_id: userId,
                },
                paranoid,
            })

            if (!member) {
                throw new NotFoundError({ message: 'User is not a member of this conversation' })
            }

            return member
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async changeLeaderRole({
        currentUserId,
        conversationUuid,
        userId,
        userMember,
        role,
    }: {
        currentUserId: number
        conversationUuid: string
        userId: number
        userMember: ConversationMember
        role: 'admin' | 'leader' | 'member'
    }) {
        try {
            const conversation = await this.userAllowedToConversation({
                userId: currentUserId,
                conversationUuid: conversationUuid,
            })

            if (!conversation.is_group) {
                throw new ForBiddenError({
                    message: 'You are not allowed to change leader role in a personal conversation',
                })
            }

            const user = await User.findByPk(userId, {
                attributes: {
                    include: ['full_name'],
                },
            })

            userMember.role = role
            const savedUserMember = await userMember.save()

            if (!savedUserMember) {
                throw new InternalServerError({ message: 'Failed to change leader role in conversation' })
            }

            ioInstance.to(conversationUuid).emit(SocketEvent.CONVERSATION_LEADER_CHANGED, {
                conversation_uuid: conversationUuid,
                key: 'role',
                value: role,
                user_id: userId,
            })

            let message = ''

            const currentUser = `${JSON.stringify({
                user_id: currentUserId,
                name: conversation.members![0].nickname || conversation.members![0].user?.full_name,
            })}`

            const targetUser = `${JSON.stringify({
                user_id: userId,
                name: user?.full_name,
            })}`

            switch (role) {
                case 'leader':
                    message = `${currentUser} đã thêm ${targetUser} làm quản trị viên nhóm.`
                    break
                case 'member':
                    message = `${currentUser} đã gỡ tư cách quản trị viên nhóm của ${targetUser}`
                    break
            }

            await addSystemMessageJob({
                conversationUuid,
                message,
                type: 'system_change_leader_role',
                currentUserId,
            })

            return savedUserMember
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async removeUserFromConversation({
        currentUserId,
        conversationUuid,
        memberId,
    }: {
        currentUserId: number
        conversationUuid: string
        memberId: number
    }) {
        try {
            const conversation = await this.userAllowedToConversation({
                userId: currentUserId,
                conversationUuid: conversationUuid,
            })

            if (!conversation.is_group) {
                throw new ForBiddenError({
                    message: 'You are not allowed to remove a user from a personal conversation',
                })
            }

            const currentUserMember = await ConversationMember.findOne({
                where: {
                    conversation_id: conversation.id,
                    user_id: currentUserId,
                },
            })

            if (!currentUserMember) {
                throw new ForBiddenError({ message: 'You are not a member of this conversation' })
            }

            if (currentUserMember.role !== 'admin' && currentUserMember.role !== 'leader') {
                throw new ForBiddenError({
                    message: 'You must be a leader or admin to remove a user from this conversation',
                })
            }

            const member = await ConversationMember.findByPk(memberId, {
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: {
                            include: ['full_name'],
                        },
                    },
                ],
            })

            if (!member) {
                throw new NotFoundError({ message: 'User is not a member of this conversation' })
            }

            // admin can remove leader and member, leader can remove member
            const permission = {
                admin: ['leader', 'member'],
                leader: ['member'],
                member: [],
            }

            if (!permission[currentUserMember.role].includes(member.role)) {
                throw new ForBiddenError({
                    message: `You are not allowed to remove ${member.role} from this conversation`,
                })
            }

            await member.save()

            ioInstance.to(conversationUuid).emit(SocketEvent.CONVERSATION_MEMBER_REMOVED, {
                conversation_uuid: conversationUuid,
                member_id: memberId,
            })

            await addSystemMessageJob({
                conversationUuid,
                message: `${JSON.stringify({
                    user_id: currentUserId,
                    name: conversation.members![0].nickname || conversation.members![0].user?.full_name,
                })} đã xóa ${JSON.stringify({
                    user_id: member.user_id,
                    name: member.user?.full_name,
                })} khỏi nhóm.`,
                type: 'system_remove_user',
                currentUserId,
            })
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async leaveConversation({ currentUserId, conversationUuid }: { currentUserId: number; conversationUuid: string }) {
        try {
            const conversation = await this.userAllowedToConversation({
                userId: currentUserId,
                conversationUuid: conversationUuid,
            })

            if (!conversation.is_group) {
                throw new ForBiddenError({
                    message: 'You are not allowed to leave a personal conversation',
                })
            }

            const userMember = await ConversationMember.findOne({
                where: {
                    conversation_id: conversation.id,
                    user_id: currentUserId,
                },
            })

            if (!userMember) {
                throw new ForBiddenError({ message: 'You are not a member of this conversation' })
            }

            userMember.deleted_type = 'left'

            await Promise.all([userMember.save(), userMember.destroy()])

            ioInstance.to(conversationUuid).emit(SocketEvent.CONVERSATION_MEMBER_LEAVED, {
                conversation_uuid: conversationUuid,
                member_id: currentUserId,
            })

            await addSystemMessageJob({
                conversationUuid,
                message: `${JSON.stringify({
                    user_id: currentUserId,
                    name: conversation.members![0].nickname || conversation.members![0].user?.full_name,
                })} đã rời khỏi nhóm.`,
                type: 'system_leave_group',
                currentUserId,
            })
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async blockConversation({ currentUserId, conversationUuid }: { currentUserId: number; conversationUuid: string }) {
        try {
            const conversation = await this.userAllowedToConversation({
                userId: currentUserId,
                conversationUuid: conversationUuid,
            })

            if (conversation.is_group) {
                throw new ForBiddenError({
                    message: 'You are not allowed to block a group conversation',
                })
            }

            const block = await Block.create({
                user_id: currentUserId,
                blockable_type: 'Conversation',
                blockable_id: conversation.id,
            })

            const userBlock = await Block.findByPk(block.id, {
                include: [
                    {
                        model: User,
                        as: 'blocker',
                        attributes: {
                            exclude: ['password', 'email'],
                        },
                    },
                ],
            })

            ioInstance.to(conversationUuid).emit(SocketEvent.CONVERSATION_BLOCKED, {
                conversation_uuid: conversationUuid,
                key: 'block_conversation',
                value: userBlock,
            })

            return userBlock
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async unblockConversation({
        currentUserId,
        conversationUuid,
    }: {
        currentUserId: number
        conversationUuid: string
    }) {
        try {
            const conversation = await this.userAllowedToConversation({
                userId: currentUserId,
                conversationUuid: conversationUuid,
            })

            if (conversation.is_group) {
                throw new ForBiddenError({
                    message: 'You are not allowed to unblock a group conversation',
                })
            }

            const block = await Block.findOne({
                where: {
                    user_id: currentUserId,
                    blockable_type: 'Conversation',
                    blockable_id: conversation.id,
                },
            })

            if (!block) {
                throw new NotFoundError({ message: 'You are not blocked this conversation' })
            }

            await block.destroy()

            ioInstance.to(conversationUuid).emit(SocketEvent.CONVERSATION_UNBLOCKED, {
                conversation_uuid: conversationUuid,
                key: 'block_conversation',
                value: null,
            })
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async removeConversation({ currentUserId, conversationUuid }: { currentUserId: number; conversationUuid: string }) {
        try {
            const conversation = await this.userAllowedToConversation({
                userId: currentUserId,
                conversationUuid: conversationUuid,
            })

            const isRemoved = await DeletedConversation.findOne({
                where: {
                    user_id: currentUserId,
                    conversation_id: conversation.id,
                },
            })

            if (isRemoved) {
                await DeletedConversation.update(
                    {
                        deleted_at: new Date(),
                    },
                    {
                        where: {
                            user_id: currentUserId,
                            conversation_id: conversation.id,
                        },
                    },
                )
            } else {
                await DeletedConversation.create({
                    user_id: currentUserId,
                    conversation_id: conversation.id,
                    deleted_at: new Date(),
                })
            }
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }
}
export default new ConversationService()
