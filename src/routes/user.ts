import express from 'express'
const router = express.Router()

import UserController from '../app/controllers/UserController'
import verifyToken from '~/app/middlewares/verifyToken'

router.get('/:nickname', verifyToken, UserController.getAnUser.bind(UserController))
router.post('/:id/add', verifyToken, UserController.addFriend.bind(UserController))
router.get('/', verifyToken, UserController.getAllFriends.bind(UserController))

export default router
