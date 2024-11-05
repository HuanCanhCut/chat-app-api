import express from 'express'
const router = express.Router()

import NotificationController from '~/app/controllers/NotificationController'
import verifyToken from '~/app/middlewares/verifyToken'

router.get('/', verifyToken, NotificationController.getNotifications)
router.patch('/read', verifyToken, NotificationController.readNotification)
router.patch('/seen', verifyToken, NotificationController.seenNotification)
router.patch('/unread', verifyToken, NotificationController.unreadNotification)
router.delete('/', verifyToken, NotificationController.deleteNotification)

export default router
