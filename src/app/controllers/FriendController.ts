import { NextFunction, Response } from 'express'

import { UnprocessableEntityError } from '../errors/errors'
import ConversationService from '../services/ConversationService'
import FriendService from '~/app/services/FriendService'
import { IRequest } from '~/type'

class FriendController {
    // [POST] /users/:id/add
    async addFriend(req: IRequest, res: Response, next: NextFunction) {
        try {
            // id of user that want to add friend
            const { id: friendId } = req.params
            const decoded = req.decoded

            if (!friendId) {
                return next(new UnprocessableEntityError({ message: 'User ID is required' }))
            }

            await FriendService.addFriend({ currentUserId: decoded.sub, friendId: Number(friendId) })

            res.sendStatus(201)
        } catch (error: any) {
            return next(error)
        }
    }

    // [GET] /users/friends?page=&per_page=
    async getAllFriends(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { page, per_page, user_id } = req.query

            if (!page || !per_page) {
                return next(new UnprocessableEntityError({ message: 'Page and per_page are required' }))
            }

            const decoded = req.decoded

            const { friends, count } = await FriendService.getAllFriends({
                currentUserId: decoded.sub,
                userId: Number(user_id),
                page: Number(page),
                per_page: Number(per_page),
            })

            const friendsWithConversation = await Promise.all(
                friends.map(async (friend) => {
                    const conversation = await ConversationService.generalConversation({
                        currentUserId: decoded.sub,
                        targetUserId: friend.get('user').id,
                    })

                    if (conversation) {
                        friend.get('user').setDataValue('conversation', conversation)
                    }

                    return friend
                }),
            )

            res.json({
                data: friendsWithConversation,
                meta: {
                    pagination: {
                        total: count,
                        count: friends.length,
                        per_page: Number(per_page),
                        current_page: Number(page),
                        total_pages: Math.ceil(count / Number(per_page)),
                    },
                },
            })
        } catch (error: any) {
            return next(error)
        }
    }

    // [POST] /users/:id/accept
    async acceptFriend(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params
            const decoded = req.decoded

            if (!id) {
                return next(new UnprocessableEntityError({ message: 'User ID is required' }))
            }

            if (decoded.sub === Number(id)) {
                return next(new UnprocessableEntityError({ message: 'You cannot accept yourself' }))
            }

            await FriendService.acceptFriend({ currentUserId: decoded.sub, userId: Number(id) })

            res.sendStatus(200)
        } catch (error: any) {
            return next(error)
        }
    }

    // [POST] /users/:id/reject
    async rejectFriendRequest(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { id: sender_id } = req.params
            const decoded = req.decoded

            if (!sender_id) {
                return next(new UnprocessableEntityError({ message: 'User ID is required' }))
            }

            if (decoded.sub === Number(sender_id)) {
                return next(new UnprocessableEntityError({ message: 'You cannot reject yourself' }))
            }

            await FriendService.rejectFriendRequest({ currentUserId: decoded.sub, senderId: Number(sender_id) })

            res.sendStatus(200)
        } catch (error: any) {
            return next(error)
        }
    }

    // [DELETE] /users/:id/unfriend
    async unfriend(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params
            const decoded = req.decoded

            if (!id) {
                return next(new UnprocessableEntityError({ message: 'User ID is required' }))
            }

            if (decoded.sub === Number(id)) {
                return next(new UnprocessableEntityError({ message: 'You cannot unfriend yourself' }))
            }

            await FriendService.unfriend({ currentUserId: decoded.sub, friendId: Number(id) })

            res.sendStatus(204)
        } catch (error: any) {
            return next(error)
        }
    }

    // [POST] /users/:id/cancel
    async cancelFriendRequest(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params
            const decoded = req.decoded

            if (!id) {
                return next(new UnprocessableEntityError({ message: 'User ID is required' }))
            }

            if (decoded.sub === Number(id)) {
                return next(new UnprocessableEntityError({ message: 'You cannot cancel friend request to yourself' }))
            }

            await FriendService.cancelFriendRequest({ currentUserId: decoded.sub, userId: Number(id) })

            res.sendStatus(200)
        } catch (error: any) {
            return next(error)
        }
    }

    // [POST] /users/friend-invitation?page=&per_page=
    async getFriendInvitation(req: IRequest, res: Response, next: NextFunction) {
        try {
            const decoded = req.decoded
            const { page, per_page } = req.query

            if (!page || !per_page) {
                return next(new UnprocessableEntityError({ message: 'Page and per_page are required' }))
            }

            const { friendInvitations, count } = await FriendService.getFriendInvitation({
                currentUserId: decoded.sub,
                page: Number(page),
                per_page: Number(per_page),
            })

            res.json({
                data: friendInvitations,
                meta: {
                    pagination: {
                        total: count,
                        count: friendInvitations.length,
                        per_page: Number(per_page),
                        current_page: Number(page),
                        total_pages: Math.ceil(count / Number(per_page)),
                    },
                },
            })
        } catch (error: any) {
            return next(error)
        }
    }
}

export default new FriendController()
