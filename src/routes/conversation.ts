import express from 'express'
const router = express.Router()
import ConversationController from '../app/controllers/ConversationController'
import upload from '~/app/middlewares/multer'

router.get('/', ConversationController.getConversations.bind(ConversationController))
router.post('/temp', ConversationController.createTempConversation.bind(ConversationController))
router.post('/', upload.single('avatar'), ConversationController.createConversation.bind(ConversationController))
router.get('/search', ConversationController.searchConversation.bind(ConversationController))
router.get('/:uuid', ConversationController.getConversationByUuid.bind(ConversationController))
router.delete('/:uuid', ConversationController.deleteConversation.bind(ConversationController))
router.patch('/:uuid/rename', ConversationController.renameConversation.bind(ConversationController))
router.patch(
    '/:uuid/avatar',
    upload.single('avatar'),
    ConversationController.changeConversationAvatar.bind(ConversationController),
)
router.patch('/:uuid/theme', ConversationController.changeConversationTheme.bind(ConversationController))
router.patch('/:uuid/emoji', ConversationController.changeConversationEmoji.bind(ConversationController))
router.patch('/:uuid/nickname', ConversationController.changeConversationMemberNickname.bind(ConversationController))
router.post('/:uuid/user', upload.none(), ConversationController.addUserToConversation.bind(ConversationController))
router.patch('/:uuid/designate-leader', ConversationController.designateLeader.bind(ConversationController))
router.patch('/:uuid/remove-leader', ConversationController.removeLeader.bind(ConversationController))
router.delete('/:uuid/user/:member_id', ConversationController.removeUserFromConversation.bind(ConversationController))
router.delete('/:uuid/leave', ConversationController.leaveConversation.bind(ConversationController))
router.post('/:uuid/block', ConversationController.blockConversation.bind(ConversationController))
router.delete('/:uuid/block', ConversationController.unblockConversation.bind(ConversationController))

export default router
