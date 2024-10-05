import express from 'express'
const router = express.Router()

import UserController from '../app/controllers/UserController'
import FriendController from '../app/controllers/FriendController'
import verifyToken from '~/app/middlewares/verifyToken'

router.get('/friends', verifyToken, FriendController.getAllFriends.bind(FriendController))
router.get('/friend-invitation', verifyToken, FriendController.getFriendInvitation.bind(FriendController))
router.post('/:id/add', verifyToken, FriendController.addFriend.bind(FriendController))
router.post('/:id/accept', verifyToken, FriendController.acceptFriend.bind(FriendController))
router.post('/:id/reject', verifyToken, FriendController.rejectFriend.bind(FriendController))
router.post('/:id/unfriend', verifyToken, FriendController.unfriend.bind(FriendController))
router.post('/:id/cancel', verifyToken, FriendController.cancelFriendRequest.bind(FriendController))
router.get('/:nickname', verifyToken, UserController.getAnUser.bind(UserController))

export default router
