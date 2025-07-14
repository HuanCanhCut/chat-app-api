import { Op, QueryTypes } from 'sequelize'

import { AppError, ConflictError, ForBiddenError, InternalServerError, NotFoundError } from '../errors/errors'
import uploadSingleFile from '../helper/uploadToCloudinary'
import { Block, Conversation, ConversationMember, ConversationTheme, User } from '../models'
import { addSystemMessageJob } from '../queue/systemMessage'
import MessageService from '../services/MessageService'
import { sequelize } from '~/config/database'
import { ioInstance } from '~/config/socket'
import { SocketEvent } from '~/enum/socketEvent'

class ConversationService {
    async userAllowedToConversation({ userId, conversationUuid }: { userId: number; conversationUuid: string }) {
        // check if user is a member of the conversation
        const conversation = await Conversation.findOne({
            where: {
                uuid: conversationUuid,
            },
            include: {
                model: ConversationMember,
                as: 'members',
                where: {
                    user_id: userId,
                },
            },
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
            await this.userAllowedToConversation({ userId: currentUserId, conversationUuid: uuid })

            const conversation = await Conversation.findOne({
                where: {
                    uuid,
                },
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
                    {
                        model: ConversationTheme,
                        as: 'theme',
                    },
                    {
                        model: Block,
                        as: 'blocks',
                        include: [
                            {
                                model: User,
                                as: 'blocked_user',
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
                    name: conversation.members![0].nickname,
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
                    name: conversation.members![0].nickname,
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
                    name: conversation.members![0].nickname,
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
                    name: conversation.members![0].nickname,
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
        memberId,
    }: {
        currentUserId: number
        conversationUuid: string
        nickname: string
        memberId: number
    }) {
        try {
            const conversation = await this.userAllowedToConversation({
                userId: currentUserId,
                conversationUuid: conversationUuid,
            })

            interface MemberWithUser extends ConversationMember {
                user: User
            }

            const [member, user] = await Promise.all([
                (await ConversationMember.findOne({
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
                        user_id: memberId,
                    },
                })) as MemberWithUser,

                User.findByPk(memberId, {
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
                user_id: memberId,
                key: 'nickname',
                value: nickname,
            })

            await addSystemMessageJob({
                conversationUuid,
                message: `${JSON.stringify({
                    user_id: currentUserId,
                    name: conversation.members![0].nickname,
                })} đã ${nickname.trim().length ? 'đặt biệt danh cho' : 'xóa biệt danh của'} ${JSON.stringify({
                    user_id: memberId,
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
        userId,
    }: {
        currentUserId: number
        conversationUuid: string
        userId: number
    }) {
        try {
            const conversation = await this.userAllowedToConversation({
                userId: currentUserId,
                conversationUuid: conversationUuid,
            })

            if (!conversation.is_group) {
                throw new ForBiddenError({ message: 'You are not allowed to add a user to a personal conversation' })
            }

            const [user, hasMemberInConversation] = await Promise.all([
                User.findByPk(userId, {
                    attributes: {
                        include: ['full_name'],
                    },
                }),

                ConversationMember.findAll({
                    where: {
                        conversation_id: conversation.id,
                        user_id: userId,
                    },
                }),
            ])

            if (!user) {
                throw new NotFoundError({ message: 'User not found' })
            }

            if (hasMemberInConversation.length > 0) {
                throw new ConflictError({ message: 'User is already in this conversation' })
            }

            const conversationMember = await ConversationMember.create({
                conversation_id: conversation.id,
                user_id: userId,
                added_by_id: currentUserId,
            })

            if (!conversationMember) {
                throw new InternalServerError({ message: 'Failed to add user to conversation' })
            }

            ioInstance.to(conversationUuid).emit(SocketEvent.CONVERSATION_MEMBER_ADDED, {
                conversation_uuid: conversationUuid,
                member: conversationMember,
            })

            await addSystemMessageJob({
                conversationUuid: conversation.uuid,
                message: `${JSON.stringify({
                    user_id: currentUserId,
                    name: conversation.members![0].nickname,
                })} đã thêm ${JSON.stringify({
                    user_id: userId,
                    name: user?.full_name,
                })} vào nhóm.`,
                type: 'system_add_user',
                currentUserId,
            })

            const member = await ConversationMember.findByPk(conversationMember.id, {
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

            return member
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
    }: {
        userId: number
        conversationUuid: string
        currentUserId: number
    }) {
        try {
            const conversation = await this.userAllowedToConversation({
                userId: currentUserId,
                conversationUuid: conversationUuid,
            })

            const member = await ConversationMember.findOne({
                where: {
                    conversation_id: conversation.get('id'),
                    user_id: userId,
                },
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
        memberId,
        userMember,
        role,
    }: {
        currentUserId: number
        conversationUuid: string
        memberId: number
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

            const user = await User.findByPk(memberId, {
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
                user_id: memberId,
            })

            let message = ''

            switch (role) {
                case 'leader':
                    message = `${JSON.stringify({
                        user_id: currentUserId,
                        name: conversation.members![0].nickname,
                    })} đã thêm ${JSON.stringify({
                        user_id: memberId,
                        name: user?.full_name,
                    })} làm quản trị viên nhóm.`
                    break
                case 'member':
                    message = `${JSON.stringify({
                        user_id: currentUserId,
                        name: conversation.members![0].nickname,
                    })} đã gỡ tư cách quản trị viên nhóm của ${JSON.stringify({
                        user_id: memberId,
                        name: user?.full_name,
                    })}`
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

            const [userMember, user] = await Promise.all([
                await ConversationMember.findOne({
                    where: {
                        conversation_id: conversation.id,
                        user_id: memberId,
                    },
                }),

                User.findByPk(memberId, {
                    attributes: {
                        include: ['full_name'],
                    },
                }),
            ])

            if (!userMember) {
                throw new NotFoundError({ message: 'User is not a member of this conversation' })
            }

            if (userMember.role === 'leader' || userMember.role === 'admin') {
                throw new ForBiddenError({
                    message: 'You are not allowed to remove a leader or admin from this conversation',
                })
            }

            await userMember.destroy()

            ioInstance.to(conversationUuid).emit(SocketEvent.CONVERSATION_MEMBER_REMOVED, {
                conversation_uuid: conversationUuid,
                member_id: memberId,
            })

            await addSystemMessageJob({
                conversationUuid,
                message: `${JSON.stringify({
                    user_id: currentUserId,
                    name: conversation.members![0].nickname,
                })} đã xóa ${JSON.stringify({
                    user_id: memberId,
                    name: user?.full_name,
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

            await userMember.destroy()

            ioInstance.to(conversationUuid).emit(SocketEvent.CONVERSATION_MEMBER_LEAVED, {
                conversation_uuid: conversationUuid,
                member_id: currentUserId,
            })

            await addSystemMessageJob({
                conversationUuid,
                message: `${JSON.stringify({
                    user_id: currentUserId,
                    name: conversation.members![0].nickname,
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
                        as: 'user',
                        attributes: {
                            exclude: ['password', 'email'],
                        },
                    },
                ],
            })

            ioInstance.to(conversationUuid).emit(SocketEvent.CONVERSATION_BLOCKED, {
                conversation_uuid: conversationUuid,
                user_block: userBlock,
            })

            return userBlock
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }
}
export default new ConversationService()
