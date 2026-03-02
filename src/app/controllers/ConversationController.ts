import { NextFunction, Response } from 'express'

import { ForBiddenError, NotFoundError, UnprocessableEntityError } from '../errors/errors'
import ConversationService from '../services/ConversationService'
import { responseModel } from '../utils/responseModel'
import { PaginationRequest, QueryRequest, UuidRequest } from '../validator/api/common'
import {
    AddUserToConversationRequest,
    ChangeConversationEmojiRequest,
    ChangeConversationMemberNicknameRequest,
    ChangeConversationThemeRequest,
    CreateConversationRequest,
    CreateTempConversationRequest,
    DesignateLeaderRequest,
    RemoveLeaderRequest,
    RemoveUserFromConversationRequest,
    RenameConversationRequest,
} from '../validator/api/conversationSchema'
import { IRequest } from '~/types/type'

class ConversationController {
    // [GET] /api/conversations
    async getConversations(req: PaginationRequest, res: Response, next: NextFunction) {
        try {
            const decoded = req.decoded

            const { page, per_page } = req.query

            const { conversations, count } = await ConversationService.getConversations({
                currentUserId: decoded.sub,
                page: page as string,
                per_page: per_page as string,
            })

            res.json(
                responseModel({
                    data: conversations,
                    total: count,
                    count: conversations.length,
                    current_page: Number(page),
                    total_pages: Math.ceil(count / Number(per_page)),
                    per_page: Number(per_page),
                }),
            )
        } catch (error: any) {
            return next(error)
        }
    }

    // [GET] /api/conversations/:uuid
    async getConversationByUuid(req: UuidRequest, res: Response, next: NextFunction) {
        try {
            const decoded = req.decoded

            const { uuid } = req.params

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
    async searchConversation(req: QueryRequest, res: Response, next: NextFunction) {
        try {
            const decoded = req.decoded

            const { q } = req.query

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
    async renameConversation(req: RenameConversationRequest, res: Response, next: NextFunction) {
        try {
            const { uuid } = req.params
            const { name } = req.body

            const decoded = req.decoded

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
    async changeConversationAvatar(req: UuidRequest, res: Response, next: NextFunction) {
        try {
            const { uuid } = req.params
            const avatar = req.file
            const decoded = req.decoded

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
    async changeConversationTheme(req: ChangeConversationThemeRequest, res: Response, next: NextFunction) {
        try {
            const { uuid } = req.params
            const { theme_id } = req.body

            const decoded = req.decoded

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
    async changeConversationEmoji(req: ChangeConversationEmojiRequest, res: Response, next: NextFunction) {
        try {
            const { uuid } = req.params
            const { emoji } = req.body

            const decoded = req.decoded

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
    async changeConversationMemberNickname(
        req: ChangeConversationMemberNicknameRequest,
        res: Response,
        next: NextFunction,
    ) {
        try {
            const { uuid } = req.params
            const { nickname, user_id } = req.body

            const decoded = req.decoded

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
    async addUserToConversation(req: AddUserToConversationRequest, res: Response, next: NextFunction) {
        try {
            const { uuid } = req.params
            const { user_id } = req.body

            const decoded = req.decoded

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
    async designateLeader(req: DesignateLeaderRequest, res: Response, next: NextFunction) {
        try {
            const { uuid } = req.params
            const { user_id } = req.body

            const decoded = req.decoded

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
    async removeLeader(req: RemoveLeaderRequest, res: Response, next: NextFunction) {
        try {
            const { uuid } = req.params
            const { user_id } = req.body
            const decoded = req.decoded

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
    async removeUserFromConversation(req: RemoveUserFromConversationRequest, res: Response, next: NextFunction) {
        try {
            const { uuid, member_id } = req.params
            const decoded = req.decoded

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

            const userBlock = await ConversationService.blockConversation({
                currentUserId: decoded.sub,
                conversationUuid: uuid,
            })

            res.json({ data: userBlock })
        } catch (e: any) {
            return next(e)
        }
    }

    // [POST] /api/conversations/:uuid/unblock
    async unblockConversation(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { uuid } = req.params
            const decoded = req.decoded

            await ConversationService.unblockConversation({
                currentUserId: decoded.sub,
                conversationUuid: uuid,
            })

            res.sendStatus(204)
        } catch (e: any) {
            return next(e)
        }
    }

    // [DELETE] /api/conversations/:uuid/remove
    async deleteConversation(req: UuidRequest, res: Response, next: NextFunction) {
        try {
            const { uuid } = req.params

            const decoded = req.decoded

            await ConversationService.deleteConversation({
                currentUserId: decoded.sub,
                conversationUuid: uuid,
            })

            res.sendStatus(204)
        } catch (e: any) {
            return next(e)
        }
    }

    // [POST] /api/conversations
    async createConversation(req: CreateConversationRequest, res: Response, next: NextFunction) {
        try {
            const { name, user_id } = req.body
            const avatar = req.file

            const decoded = req.decoded

            if (!avatar) {
                throw new UnprocessableEntityError({ message: 'avatar is required' })
            }

            const createdConversation = await ConversationService.createConversation({
                currentUserId: decoded.sub,
                name,
                avatar: avatar as Express.Multer.File,
                userIds: user_id,
            })

            res.json({ data: createdConversation })
        } catch (e: any) {
            return next(e)
        }
    }

    // [POST] /api/conversations/temp
    async createTempConversation(req: CreateTempConversationRequest, res: Response, next: NextFunction) {
        try {
            const { user_id } = req.body

            const decoded = req.decoded

            const createdConversation = await ConversationService.createTempConversation({
                currentUserId: decoded.sub,
                userId: user_id,
            })

            res.json({ data: createdConversation })
        } catch (e: any) {
            return next(e)
        }
    }
}
export default new ConversationController()
