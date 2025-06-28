import express from 'express'
const router = express.Router()

import ConversationController from '../app/controllers/ConversationController'
import verifyToken from '../app/middlewares/verifyToken'

router.get('/', verifyToken, ConversationController.getConversations.bind(ConversationController))
router.get('/search', verifyToken, ConversationController.searchConversation.bind(ConversationController))
router.get('/:uuid', verifyToken, ConversationController.getConversationByUuid.bind(ConversationController))
router.patch('/:uuid/rename', verifyToken, ConversationController.renameConversation.bind(ConversationController))

export default router
