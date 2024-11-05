import express from 'express'
const router = express.Router()

import NotificationController from '~/app/controllers/NotificationController'
import verifyToken from '~/app/middlewares/verifyToken'

router.get('/', verifyToken, NotificationController.getNotifications)
router.patch('/mark-as-read', verifyToken, NotificationController.markAsRead)
router.patch('/mark-as-unread', verifyToken, NotificationController.markAsUnread)
router.patch('/seen', verifyToken, NotificationController.seenNotification)
router.delete('/:id', verifyToken, NotificationController.deleteNotification)

export default router
