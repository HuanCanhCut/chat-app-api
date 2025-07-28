import express from 'express'
const router = express.Router()

import NotificationController from '~/app/controllers/NotificationController'

router.get('/', NotificationController.getNotifications)
router.patch('/mark-as-read', NotificationController.markAsRead)
router.patch('/mark-as-unread', NotificationController.markAsUnread)
router.patch('/seen', NotificationController.seenNotification)
router.delete('/:id', NotificationController.deleteNotification)

export default router
