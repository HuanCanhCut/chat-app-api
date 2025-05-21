import express from 'express'
const router = express.Router()

import verifyToken from '../app/middlewares/verifyToken'
import MessageController from '../app/controllers/MessageController'

router.get('/:messageId/reactions', verifyToken, MessageController.getReactions.bind(MessageController))
router.patch('/revoke', verifyToken, MessageController.revokeMessage.bind(MessageController))
router.get('/:messageId/reaction/types', verifyToken, MessageController.getReactionsTypes.bind(MessageController))
router.get('/:conversationUuid/images', verifyToken, MessageController.getMessageImages.bind(MessageController))
router.get('/:messageId/around', verifyToken, MessageController.getAroundMessages.bind(MessageController))
router.get('/:conversationUuid', verifyToken, MessageController.getMessages.bind(MessageController))

export default router
