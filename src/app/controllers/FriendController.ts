import { Response, NextFunction } from 'express'

import { BadRequest, ConflictError, InternalServerError, NotFoundError } from '../errors/errors'
import { Friendships, User } from '../models'
import { Sequelize } from 'sequelize'
import { Op } from 'sequelize'
import { IRequest } from '~/type'
import { friendShipJoinLiteral, isFriendLiteral } from '../utils/isFriend'
import checkIsFriend from '../utils/isFriend'
import sentMakeFriendRequest from '../utils/sentMakeFriendRequest'
import { sequelize } from '~/config/db'

class FriendController {
    // [POST] /user/:id/add
    async addFriend(req: IRequest, res: Response, next: NextFunction) {
        try {
            // id of user that want to add friend
            const { id: id } = req.params
            const decoded = req.decoded

            if (!id) {
                return next(new BadRequest({ message: 'User ID is required' }))
            }

            const hasUser = await User.findOne<any>({ where: { id } })

            if (!hasUser) {
                return next(new NotFoundError({ message: 'User not found' }))
            }

            if (hasUser.id === decoded.sub) {
                return next(new ConflictError({ message: 'You cannot add yourself as a friend' }))
            }

            const isFriend = await checkIsFriend(decoded.sub, Number(id))

            if (isFriend) {
                return next(new ConflictError({ message: 'User is already your friend' }))
            }

            const isMakeFriendRequest = await sentMakeFriendRequest({
                userId: decoded.sub,
                friendId: Number(id),
                toWay: true,
            })

            if (isMakeFriendRequest) {
                return next(new ConflictError({ message: 'You have already sent a friend request to this user' }))
            }

            const newFriendship = await Friendships.create({
                user_id: decoded.sub,
                friend_id: Number(id),
            })

            if (!newFriendship) {
                return next(new InternalServerError({ message: 'Failed to add friend' }))
            }

            res.sendStatus(201)
        } catch (error: any) {
            return next(new InternalServerError({ message: error.message }))
        }
    }

    // [GET] /user/friends?page=&per_page=
    async getAllFriends(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { page, per_page, user_id } = req.query

            if (!page || !per_page) {
                return next(new BadRequest({ message: 'Page and per_page are required' }))
            }

            const decoded = req.decoded

            const { rows: friends, count } = await Friendships.findAndCountAll<any>({
                where: {
                    status: 'accepted',
                },
                include: {
                    attributes: {
                        include: [[sequelize.literal(isFriendLiteral(Number(decoded.sub))), 'is_friend']],
                    },
                    model: User,
                    as: 'user',
                    required: true,
                    nested: true,
                    on: friendShipJoinLiteral(Number(user_id)),
                },
                limit: Number(per_page),
                offset: (Number(page) - 1) * Number(per_page),
            })

            res.json({
                data: friends,
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
            return next(new InternalServerError({ message: error.message }))
        }
    }

    // [POST] /user/:id/accept
    async acceptFriend(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params
            const decoded = req.decoded

            if (!id) {
                return next(new BadRequest({ message: 'User ID is required' }))
            }

            if (decoded.sub === Number(id)) {
                return next(new BadRequest({ message: 'You cannot accept yourself' }))
            }

            const [isFriend, isMakeFriendRequest] = await Promise.all([
                checkIsFriend(decoded.sub, Number(id)),
                sentMakeFriendRequest({ userId: Number(id), friendId: decoded.sub }),
            ])

            if (isFriend) {
                return next(new ConflictError({ message: 'User is already your friend' }))
            }

            if (!isMakeFriendRequest) {
                return next(new NotFoundError({ message: 'Friend request not found' }))
            }

            const updateSuccess = await isMakeFriendRequest.update({ status: 'accepted' })

            if (!updateSuccess) {
                return next(new InternalServerError({ message: 'Failed to accept friend request' }))
            }

            res.sendStatus(200)
        } catch (error: any) {
            return next(new InternalServerError({ message: error.message }))
        }
    }

    // [POST] /user/:id/reject
    async rejectFriend(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params
            const decoded = req.decoded

            if (!id) {
                return next(new BadRequest({ message: 'User ID is required' }))
            }

            if (decoded.sub === Number(id)) {
                return next(new BadRequest({ message: 'You cannot reject yourself' }))
            }

            // Check if the user has sent a friend request to the this user
            const isMakeFriendRequest = await sentMakeFriendRequest({
                userId: Number(id),
                friendId: decoded.sub,
                toWay: false,
            })

            if (!isMakeFriendRequest) {
                return next(new NotFoundError({ message: 'Friend request not found' }))
            }

            await isMakeFriendRequest.destroy()

            res.sendStatus(200)
        } catch (error: any) {
            return next(new InternalServerError({ message: error.message }))
        }
    }

    // [POST] /user/:id/unfriend
    async unfriend(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params
            const decoded = req.decoded

            if (!id) {
                return next(new BadRequest({ message: 'User ID is required' }))
            }

            if (decoded.sub === Number(id)) {
                return next(new BadRequest({ message: 'You cannot unfriend yourself' }))
            }

            const isFriend = await checkIsFriend(decoded.sub, Number(id))

            if (!isFriend) {
                return next(new BadRequest({ message: 'User is not your friend' }))
            }

            await Friendships.destroy({
                where: {
                    [Op.or]: [
                        { user_id: decoded.sub, friend_id: Number(id) },
                        { user_id: Number(id), friend_id: decoded.sub },
                    ],
                },
            })

            res.sendStatus(200)
        } catch (error: any) {
            return next(new InternalServerError({ message: error.message }))
        }
    }

    // [POST] /user/:id/cancel
    async cancelFriendRequest(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params
            const decoded = req.decoded

            if (!id) {
                return next(new BadRequest({ message: 'User ID is required' }))
            }

            if (decoded.sub === Number(id)) {
                return next(new BadRequest({ message: 'You cannot cancel friend request to yourself' }))
            }

            const isMakeFriendRequest = await sentMakeFriendRequest({
                userId: decoded.sub,
                friendId: Number(id),
            })

            if (!isMakeFriendRequest) {
                return next(new NotFoundError({ message: 'Friend request not found' }))
            }

            await isMakeFriendRequest.destroy()

            res.sendStatus(200)
        } catch (error: any) {
            return next(new InternalServerError({ message: error.message }))
        }
    }

    // [POST] /user/friend-invitation?page=&per_page=
    async getFriendInvitation(req: IRequest, res: Response, next: NextFunction) {
        try {
            const decoded = req.decoded
            const { page, per_page } = req.query

            if (!page || !per_page) {
                return next(new BadRequest({ message: 'Page and per_page are required' }))
            }

            // Danh sách lời mời kết bạn
            const { rows: friendInvitations, count } = await Friendships.findAndCountAll<any>({
                where: {
                    [Op.and]: [{ status: 'pending' }, { friend_id: decoded.sub }],
                },
                include: {
                    model: User,
                    as: 'user',
                    required: true,
                    where: {
                        id: Sequelize.col('Friendships.user_id'),
                    },
                },
                limit: Number(per_page),
                offset: (Number(page) - 1) * Number(per_page),
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
            return next(new InternalServerError({ message: error.message }))
        }
    }
}

export default new FriendController()
