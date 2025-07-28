import express from 'express'
const router = express.Router()

import MessageController from '../app/controllers/MessageController'

router.get('/search', MessageController.searchMessages.bind(MessageController))
router.get('/:conversationUuid/links', MessageController.getLinks.bind(MessageController))
router.post('/link-preview', MessageController.getLinkPreview.bind(MessageController))
router.get('/:messageId/reactions', MessageController.getReactions.bind(MessageController))
router.get('/:messageId/reaction/types', MessageController.getReactionsTypes.bind(MessageController))
router.get('/:conversationUuid/images', MessageController.getMessageImages.bind(MessageController))
router.get('/:messageId/around', MessageController.getAroundMessages.bind(MessageController))
router.get('/:conversationUuid', MessageController.getMessages.bind(MessageController))
router.patch('/revoke', MessageController.revokeMessage.bind(MessageController))

export default router
