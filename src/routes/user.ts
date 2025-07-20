import express from 'express'
const router = express.Router()

import FriendController from '../app/controllers/FriendController'
import UserController from '../app/controllers/UserController'
import verifyToken from '~/app/middlewares/verifyToken'

router.get('/friends', verifyToken, FriendController.getAllFriends.bind(FriendController))
router.get('/friends/search', verifyToken, FriendController.searchFriend.bind(FriendController))
router.get('/friend-invitation', verifyToken, FriendController.getFriendInvitation.bind(FriendController))
router.post('/:id/add', verifyToken, FriendController.addFriend.bind(FriendController))
router.post('/:id/accept', verifyToken, FriendController.acceptFriend.bind(FriendController))
router.post('/:id/reject', verifyToken, FriendController.rejectFriendRequest.bind(FriendController))
router.delete('/:id/unfriend', verifyToken, FriendController.unfriend.bind(FriendController))
router.post('/:id/cancel', verifyToken, FriendController.cancelFriendRequest.bind(FriendController))
router.get('/search', verifyToken, UserController.searchUser.bind(UserController))
router.get('/search-history', verifyToken, UserController.getSearchHistory.bind(UserController))
router.post('/search-history', verifyToken, UserController.setSearchHistory.bind(UserController))
router.get('/:nickname', verifyToken, UserController.getAnUser.bind(UserController))
export default router
