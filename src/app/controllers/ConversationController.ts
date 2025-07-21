import { NextFunction, Response } from 'express'

import { ForBiddenError, NotFoundError, UnprocessableEntityError } from '../errors/errors'
import ConversationService from '../services/ConversationService'
import { IRequest } from '~/type'

class ConversationController {
    // [GET] /api/conversations
    async getConversations(req: IRequest, res: Response, next: NextFunction) {
        try {
            const decoded = req.decoded

            const { page, per_page } = req.query

            if (!page || !per_page) {
                return next(new UnprocessableEntityError({ message: 'Page and per page are required' }))
            }

            const conversations = await ConversationService.getConversations({
                currentUserId: decoded.sub,
                page: page as string,
                per_page: per_page as string,
            })

            res.json({ data: conversations })
        } catch (error: any) {
            return next(error)
        }
    }

    // [GET] /api/conversations/:uuid
    async getConversationByUuid(req: IRequest, res: Response, next: NextFunction) {
        try {
            const decoded = req.decoded

            const uuid = req.params.uuid

            const conversation = await ConversationService.getConversationByUuid({
                currentUserId: decoded.sub,
                uuid,
            })

            res.json({ data: conversation })
        } catch (error: any) {
            return next(error)
        }
    }

    // [GET] /api/conversations/search
    async searchConversation(req: IRequest, res: Response, next: NextFunction) {
        try {
            const decoded = req.decoded

            const { q } = req.query

            if (!q) {
                return next(new UnprocessableEntityError({ message: 'Search query is required' }))
            }

            const conversations = await ConversationService.searchConversation({
                currentUserId: decoded.sub,
                q: q as string,
            })

            res.json({ data: conversations })
        } catch (error: any) {
            return next(error)
        }
    }

    // [PATCH] /api/conversations/:uuid/rename
    async renameConversation(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { uuid } = req.params
            const { name } = req.body

            const decoded = req.decoded

            if (!name) {
                return next(new UnprocessableEntityError({ message: 'name is required' }))
            }

            if (!uuid) {
                return next(new UnprocessableEntityError({ message: 'conversation_uuid is required' }))
            }

            const updatedConversation = await ConversationService.renameConversation({
                currentUserId: decoded.sub,
                conversationUuid: uuid,
                conversationName: name,
            })

            res.json({ data: updatedConversation })
        } catch (error: any) {
            return next(error)
        }
    }

    // [PATCH] /api/conversations/:uuid/avatar
    async changeConversationAvatar(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { uuid } = req.params
            const avatar = req.file
            const decoded = req.decoded

            if (!uuid) {
                return next(new UnprocessableEntityError({ message: 'conversation_uuid is required' }))
            }

            if (!avatar) {
                return next(new UnprocessableEntityError({ message: 'avatar is required' }))
            }

            const updatedConversation = await ConversationService.changeConversationAvatar({
                currentUserId: decoded.sub,
                conversationUuid: uuid,
                avatar,
            })

            res.json({ data: updatedConversation })
        } catch (e: any) {
            return next(e)
        }
    }

    // [PATCH] /api/conversations/:uuid/theme
    async changeConversationTheme(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { uuid } = req.params
            const { theme_id } = req.body

            const decoded = req.decoded

            if (!uuid) {
                return next(new UnprocessableEntityError({ message: 'conversation_uuid is required' }))
            }

            if (!theme_id) {
                return next(new UnprocessableEntityError({ message: 'theme_id is required' }))
            }

            const updatedConversation = await ConversationService.changeConversationTheme({
                currentUserId: decoded.sub,
                conversationUuid: uuid,
                themeId: theme_id,
            })

            res.json({ data: updatedConversation })
        } catch (e: any) {
            return next(e)
        }
    }

    // [PATCH] /api/conversations/:uuid/emoji
    async changeConversationEmoji(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { uuid } = req.params
            const { emoji } = req.body

            const decoded = req.decoded

            if (!uuid) {
                return next(new UnprocessableEntityError({ message: 'conversation_uuid is required' }))
            }

            if (!emoji) {
                return next(new UnprocessableEntityError({ message: 'emoji is required' }))
            }

            const updatedConversation = await ConversationService.changeConversationEmoji({
                currentUserId: decoded.sub,
                conversationUuid: uuid,
                emoji,
            })

            res.json({ data: updatedConversation })
        } catch (e: any) {
            return next(e)
        }
    }

    // [PATCH] /api/conversations/:uuid/nickname
    async changeConversationMemberNickname(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { uuid } = req.params
            const { nickname, user_id } = req.body

            const decoded = req.decoded

            if (!uuid) {
                return next(new UnprocessableEntityError({ message: 'conversation_uuid is required' }))
            }

            if (nickname === null || nickname === undefined) {
                return next(new UnprocessableEntityError({ message: 'nickname is required' }))
            }

            if (!user_id) {
                return next(new UnprocessableEntityError({ message: 'user_id is required' }))
            }

            const updatedConversation = await ConversationService.changeConversationMemberNickname({
                currentUserId: decoded.sub,
                conversationUuid: uuid,
                nickname,
                userId: user_id,
            })

            res.json({ data: updatedConversation })
        } catch (e: any) {
            return next(e)
        }
    }

    // [POST] /api/conversations/:uuid/user
    async addUserToConversation(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { uuid } = req.params
            const { user_id } = req.body

            const decoded = req.decoded

            if (!uuid) {
                return next(new UnprocessableEntityError({ message: 'conversation_uuid is required' }))
            }

            if (!user_id) {
                return next(new UnprocessableEntityError({ message: 'user_id is required' }))
            }

            if (!Array.isArray(user_id)) {
                return next(new UnprocessableEntityError({ message: 'user_id must be an array' }))
            }

            const addedMembers = await ConversationService.addUserToConversation({
                currentUserId: decoded.sub,
                conversationUuid: uuid,
                userIds: user_id.map(Number),
            })

            res.json({ data: addedMembers })
        } catch (e: any) {
            return next(e)
        }
    }

    // [PATCH] /api/conversations/:uuid/designate-leader
    async designateLeader(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { uuid } = req.params
            const { user_id } = req.body

            const decoded = req.decoded

            if (!uuid) {
                return next(new UnprocessableEntityError({ message: 'conversation_uuid is required' }))
            }

            if (!user_id) {
                return next(new UnprocessableEntityError({ message: 'user_id is required' }))
            }

            const [currentUserMember, userMember] = await Promise.all([
                ConversationService.getMemberInConversation({
                    userId: decoded.sub,
                    conversationUuid: uuid,
                    currentUserId: decoded.sub,
                }),
                ConversationService.getMemberInConversation({
                    userId: user_id,
                    conversationUuid: uuid,
                    currentUserId: decoded.sub,
                }),
            ])

            if (currentUserMember.role !== 'admin' && currentUserMember.role !== 'leader') {
                throw new ForBiddenError({ message: 'You are not allowed to appoint a leader to this conversation' })
            }

            if (userMember.role === 'leader' || userMember.role === 'admin') {
                throw new ForBiddenError({
                    message: `That user is already a ${userMember.role} of this conversation`,
                })
            }

            const updatedConversation = await ConversationService.changeLeaderRole({
                currentUserId: decoded.sub,
                conversationUuid: uuid,
                userId: Number(user_id),
                userMember,
                role: 'leader',
            })

            res.json({ data: updatedConversation })
        } catch (e: any) {
            return next(e)
        }
    }

    // [PATCH] /api/conversations/:uuid/remove-leader
    async removeLeader(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { uuid } = req.params
            const { user_id } = req.body
            const decoded = req.decoded

            if (!uuid) {
                return next(new UnprocessableEntityError({ message: 'conversation_uuid is required' }))
            }

            if (!user_id) {
                return next(new UnprocessableEntityError({ message: 'user_id is required' }))
            }

            const [currentUserMember, leader] = await Promise.all([
                ConversationService.getMemberInConversation({
                    userId: decoded.sub,
                    conversationUuid: uuid,
                    currentUserId: decoded.sub,
                }),

                ConversationService.getMemberInConversation({
                    userId: user_id,
                    conversationUuid: uuid,
                    currentUserId: decoded.sub,
                }),
            ])

            if (!leader) {
                throw new NotFoundError({ message: 'Leader not found' })
            }

            if (leader.id === currentUserMember.id) {
                throw new ForBiddenError({ message: 'You cannot remove yourself as a leader of this conversation' })
            }

            if (leader.role !== 'leader') {
                throw new ForBiddenError({ message: 'Member is not a leader of this conversation' })
            }

            const updatedConversation = await ConversationService.changeLeaderRole({
                currentUserId: decoded.sub,
                conversationUuid: uuid,
                userId: Number(user_id),
                userMember: leader,
                role: 'member',
            })

            res.json({ data: updatedConversation })
        } catch (e: any) {
            return next(e)
        }
    }

    // [DELETE] /api/conversations/:uuid/user/:userId
    async removeUserFromConversation(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { uuid, member_id } = req.params
            const decoded = req.decoded

            if (!uuid) {
                return next(new UnprocessableEntityError({ message: 'conversation_uuid is required' }))
            }

            if (!member_id) {
                return next(new UnprocessableEntityError({ message: 'user_id is required' }))
            }

            await ConversationService.removeUserFromConversation({
                currentUserId: decoded.sub,
                conversationUuid: uuid,
                memberId: Number(member_id),
            })

            res.sendStatus(204)
        } catch (e: any) {
            return next(e)
        }
    }

    // [DELETE] /api/conversations/:uuid/leave
    async leaveConversation(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { uuid } = req.params
            const decoded = req.decoded

            if (!uuid) {
                return next(new UnprocessableEntityError({ message: 'conversation_uuid is required' }))
            }

            await ConversationService.leaveConversation({
                currentUserId: decoded.sub,
                conversationUuid: uuid,
            })

            res.sendStatus(204)
        } catch (e: any) {
            return next(e)
        }
    }

    // [POST] /api/conversations/:uuid/block
    async blockConversation(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { uuid } = req.params
            const decoded = req.decoded

            if (!uuid) {
                return next(new UnprocessableEntityError({ message: 'conversation_uuid is required' }))
            }

            const userBlock = await ConversationService.blockConversation({
                currentUserId: decoded.sub,
                conversationUuid: uuid,
            })

            res.json({ data: userBlock })
        } catch (e: any) {
            return next(e)
        }
    }
}
export default new ConversationController()
