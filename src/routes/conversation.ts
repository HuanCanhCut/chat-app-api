import express from 'express'

import ConversationController from '../app/controllers/ConversationController'
import upload from '~/app/middlewares/multer'
import { validate } from '~/app/middlewares/validate'
import { paginationSchema, querySchema, uuidSchema } from '~/app/validator/api/common'
import {
    changeConversationEmojiSchema,
    changeConversationMemberNicknameSchema,
    changeConversationThemeSchema,
    createTempConversationSchema,
    designateLeaderSchema,
    removeLeaderSchema,
    removeUserFromConversationSchema,
    renameConversationSchema,
} from '~/app/validator/api/conversationSchema'

const router = express.Router()

router.get('/', validate(paginationSchema), ConversationController.getConversations.bind(ConversationController))
router.get('/penguin-ai', ConversationController.getPenguinAIConversation.bind(ConversationController))
router.post(
    '/temp',
    validate(createTempConversationSchema),
    ConversationController.createTempConversation.bind(ConversationController),
)
router.post('/', upload.single('avatar'), ConversationController.createConversation.bind(ConversationController))
router.get('/search', validate(querySchema), ConversationController.searchConversation.bind(ConversationController))
router.get('/:uuid', validate(uuidSchema), ConversationController.getConversationByUuid.bind(ConversationController))
router.delete('/:uuid', validate(uuidSchema), ConversationController.deleteConversation.bind(ConversationController))
router.patch(
    '/:uuid/rename',
    validate(renameConversationSchema),
    ConversationController.renameConversation.bind(ConversationController),
)
router.patch(
    '/:uuid/avatar',
    validate(uuidSchema),
    upload.single('avatar'),
    ConversationController.changeConversationAvatar.bind(ConversationController),
)
router.patch(
    '/:uuid/theme',
    validate(changeConversationThemeSchema),
    ConversationController.changeConversationTheme.bind(ConversationController),
)
router.patch(
    '/:uuid/emoji',
    validate(changeConversationEmojiSchema),
    ConversationController.changeConversationEmoji.bind(ConversationController),
)
router.patch(
    '/:uuid/nickname',
    validate(changeConversationMemberNicknameSchema),
    ConversationController.changeConversationMemberNickname.bind(ConversationController),
)
router.post('/:uuid/user', upload.none(), ConversationController.addUserToConversation.bind(ConversationController))
router.patch(
    '/:uuid/designate-leader',
    validate(designateLeaderSchema),
    ConversationController.designateLeader.bind(ConversationController),
)
router.patch(
    '/:uuid/remove-leader',
    validate(removeLeaderSchema),
    ConversationController.removeLeader.bind(ConversationController),
)
router.delete(
    '/:uuid/user/:member_id',
    validate(removeUserFromConversationSchema),
    ConversationController.removeUserFromConversation.bind(ConversationController),
)
router.delete(
    '/:uuid/leave',
    validate(uuidSchema),
    ConversationController.leaveConversation.bind(ConversationController),
)
router.post('/:uuid/block', validate(uuidSchema), ConversationController.blockConversation.bind(ConversationController))
router.delete(
    '/:uuid/block',
    validate(uuidSchema),
    ConversationController.unblockConversation.bind(ConversationController),
)

export default router
