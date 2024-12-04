import express from 'express'
const router = express.Router()

import verifyToken from '../app/middlewares/verifyToken'
import ConversationController from '../app/controllers/ConversationController'

router.get('/', verifyToken, ConversationController.getConversations.bind(ConversationController))
router.get('/:uuid', verifyToken, ConversationController.getConversationByUuid.bind(ConversationController))

export default router
