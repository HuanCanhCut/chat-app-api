import { NextFunction, Response } from 'express'
import { Op } from 'sequelize'

import { IRequest } from '~/type'
import { BadRequest, InternalServerError } from '../errors/errors'
import Notification from '../models/NotificationModel'
import User from '../models/UserModel'
import { responseModel } from '../utils/responseMode'
import NotificationDetail from '../models/NotificationDetailModel'

class NotificationController {
    async getNotifications(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { page = 1, per_page = 10, type } = req.query

            if (type !== 'all' && type !== 'unread') {
                return next(new BadRequest({ message: 'Invalid type' }))
            }

            const decoded = req.decoded

            const whereCondition: any = {}

            if (type === 'unread') {
                whereCondition['is_read'] = false
            }

            const { rows: notifications, count: total } = await Notification.findAndCountAll({
                where: {
                    recipient_id: decoded.sub,
                },
                include: [
                    {
                        model: NotificationDetail,
                        as: 'notification_details',
                        required: true,
                        where: whereCondition,
                        include: [
                            {
                                model: User,
                                as: 'sender_user',
                                required: true,
                                attributes: {
                                    exclude: ['password', 'email'],
                                },
                            },
                        ],
                    },
                ],
                order: [['created_at', 'DESC']],
                limit: Number(per_page),
                offset: (Number(page) - 1) * Number(per_page),
            })

            res.json(
                responseModel({
                    data: notifications,
                    total,
                    count: notifications.length,
                    current_page: Number(page),
                    total_pages: Math.ceil(total / Number(per_page)),
                    per_page: Number(per_page),
                }),
            )
        } catch (error: any) {
            return next(new InternalServerError({ message: error.message }))
        }
    }

    async readNotification(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { notification_id } = req.body

            if (!notification_id) {
                return next(new BadRequest({ message: 'Notification id is required' }))
            }

            await NotificationDetail.update({ is_read: true }, { where: { id: notification_id } })

            res.sendStatus(200)
        } catch (error: any) {
            return next(new InternalServerError({ message: error.message }))
        }
    }

    async seenNotification(req: IRequest, res: Response, next: NextFunction) {
        try {
            const decoded = req.decoded

            await NotificationDetail.update(
                { is_seen: true },
                {
                    where: {
                        notification_id: {
                            [Op.in]: (
                                await Notification.findAll({
                                    attributes: ['id'],
                                    where: {
                                        recipient_id: decoded.sub,
                                    },
                                })
                            )
                                .map((item) => item.id)
                                .filter((id) => id !== undefined),
                        },
                    },
                },
            )

            res.sendStatus(200)
        } catch (error: any) {
            return next(new InternalServerError({ message: error.message }))
        }
    }

    async unreadNotification(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { notification_id } = req.body

            if (!notification_id) {
                return next(new BadRequest({ message: 'Notification id is required' }))
            }

            await NotificationDetail.update({ is_read: false }, { where: { id: notification_id } })

            res.sendStatus(200)
        } catch (error: any) {
            return next(new InternalServerError({ message: error.message }))
        }
    }

    async deleteNotification(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { notification_id } = req.body

            if (!notification_id) {
                return next(new BadRequest({ message: 'Notification id is required' }))
            }

            await Notification.destroy({ where: { id: notification_id } })

            res.sendStatus(200)
        } catch (error: any) {
            return next(new InternalServerError({ message: error.message }))
        }
    }
}

export default new NotificationController()
