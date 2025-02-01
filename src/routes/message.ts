import express from 'express'
const router = express.Router()

import verifyToken from '../app/middlewares/verifyToken'
import MessageController from '../app/controllers/MessageController'

router.get('/:conversationUuid/images', verifyToken, MessageController.getMessageImages.bind(MessageController))
router.get('/:conversationUuid', verifyToken, MessageController.getMessages.bind(MessageController))

export default router
