import express from 'express'
const router = express.Router()
import ConversationController from '../app/controllers/ConversationController'
import verifyToken from '../app/middlewares/verifyToken'
import upload from '~/app/middlewares/multer'

router.get('/', verifyToken, ConversationController.getConversations.bind(ConversationController))
router.get('/search', verifyToken, ConversationController.searchConversation.bind(ConversationController))
router.get('/:uuid', verifyToken, ConversationController.getConversationByUuid.bind(ConversationController))
router.patch('/:uuid/rename', verifyToken, ConversationController.renameConversation.bind(ConversationController))
router.patch(
    '/:uuid/avatar',
    verifyToken,
    upload.single('avatar'),
    ConversationController.changeConversationAvatar.bind(ConversationController),
)
router.patch('/:uuid/theme', verifyToken, ConversationController.changeConversationTheme.bind(ConversationController))

export default router
