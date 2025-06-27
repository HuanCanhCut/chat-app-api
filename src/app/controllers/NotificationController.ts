import { NextFunction, Response } from 'express'

import { UnprocessableEntityError } from '../errors/errors'
import Notification from '../models/NotificationModel'
import NotificationService from '../services/NotificationService'
import { responseModel } from '~/app/utils/responseModel'
import { IRequest } from '~/type'

class NotificationController {
    // [GET] /notifications?page=&per_page=&type=
    async getNotifications(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { page = 1, per_page = 10, type } = req.query

            if (type !== 'all' && type !== 'unread') {
                return next(new UnprocessableEntityError({ message: 'Invalid type' }))
            }

            const decoded = req.decoded

            const { notifications, total } = await NotificationService.getNotifications({
                currentUserId: decoded.sub,
                page: Number(page),
                per_page: Number(per_page),
                type: type as 'all' | 'unread',
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
            return next(error)
        }
    }

    // [PUT] /notifications/mark-as-read
    async markAsRead(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { notification_id } = req.body

            if (!notification_id) {
                return next(new UnprocessableEntityError({ message: 'Notification id is required' }))
            }

            await NotificationService.markAsRead({ notificationId: notification_id })

            res.sendStatus(200)
        } catch (error: any) {
            return next(error)
        }
    }

    // [PUT] /notifications/mark-as-seen
    async seenNotification(req: IRequest, res: Response, next: NextFunction) {
        try {
            const decoded = req.decoded

            await NotificationService.markAsSeen({ currentUserId: decoded.sub })

            res.sendStatus(200)
        } catch (error: any) {
            return next(error)
        }
    }

    // [PUT] /notifications/mark-as-unread
    async markAsUnread(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { notification_id } = req.body

            if (!notification_id) {
                return next(new UnprocessableEntityError({ message: 'Notification id is required' }))
            }

            await NotificationService.markAsUnread({ notificationId: notification_id })

            res.sendStatus(200)
        } catch (error: any) {
            return next(error)
        }
    }

    // [DELETE] /notifications/:id
    async deleteNotification(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { id: notification_id } = req.params

            if (!notification_id) {
                return next(new UnprocessableEntityError({ message: 'Notification id is required' }))
            }

            await Notification.destroy({ where: { id: notification_id } })

            res.sendStatus(200)
        } catch (error: any) {
            return next(error)
        }
    }
}

export default new NotificationController()
