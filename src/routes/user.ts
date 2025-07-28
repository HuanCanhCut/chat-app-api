import express from 'express'
const router = express.Router()

import FriendController from '../app/controllers/FriendController'
import UserController from '../app/controllers/UserController'

router.get('/friends', FriendController.getAllFriends.bind(FriendController))
router.get('/friends/search', FriendController.searchFriend.bind(FriendController))
router.get('/friend-invitation', FriendController.getFriendInvitation.bind(FriendController))
router.post('/:id/add', FriendController.addFriend.bind(FriendController))
router.post('/:id/accept', FriendController.acceptFriend.bind(FriendController))
router.post('/:id/reject', FriendController.rejectFriendRequest.bind(FriendController))
router.delete('/:id/unfriend', FriendController.unfriend.bind(FriendController))
router.post('/:id/cancel', FriendController.cancelFriendRequest.bind(FriendController))

router.get('/search', UserController.searchUser.bind(UserController))
router.get('/search-history', UserController.getSearchHistory.bind(UserController))
router.post('/search-history', UserController.setSearchHistory.bind(UserController))
router.get('/:nickname', UserController.getAnUser.bind(UserController))
export default router
