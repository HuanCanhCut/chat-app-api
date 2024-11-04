import express from 'express'
const router = express.Router()

import NotificationController from '~/app/controllers/NotificationController'
import verifyToken from '~/app/middlewares/verifyToken'

router.get('/', verifyToken, NotificationController.getNotifications)

export default router
