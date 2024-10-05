import express from 'express'
const router = express.Router()

import UserController from '../app/controllers/UserController'
import verifyToken from '~/app/middlewares/verifyToken'

router.get('/', verifyToken, UserController.getAllFriends.bind(UserController))
router.get('/friend-invitation', verifyToken, UserController.getFriendInvitation.bind(UserController))
router.post('/:id/add', verifyToken, UserController.addFriend.bind(UserController))
router.post('/:id/accept', verifyToken, UserController.acceptFriend.bind(UserController))
router.post('/:id/reject', verifyToken, UserController.rejectFriend.bind(UserController))
router.get('/:nickname', verifyToken, UserController.getAnUser.bind(UserController))

export default router
