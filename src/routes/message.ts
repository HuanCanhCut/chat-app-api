import express from 'express'
const router = express.Router()

import MessageController from '../app/controllers/MessageController'
import verifyToken from '../app/middlewares/verifyToken'

router.get('/search', verifyToken, MessageController.searchMessages.bind(MessageController))
router.get('/links', verifyToken, MessageController.getLinks.bind(MessageController))
router.post('/link-preview', MessageController.getLinkPreview.bind(MessageController))
router.get('/:messageId/reactions', verifyToken, MessageController.getReactions.bind(MessageController))
router.get('/:messageId/reaction/types', verifyToken, MessageController.getReactionsTypes.bind(MessageController))
router.get('/:conversationUuid/images', verifyToken, MessageController.getMessageImages.bind(MessageController))
router.get('/:messageId/around', verifyToken, MessageController.getAroundMessages.bind(MessageController))
router.get('/:conversationUuid', verifyToken, MessageController.getMessages.bind(MessageController))
router.patch('/revoke', verifyToken, MessageController.revokeMessage.bind(MessageController))

export default router
