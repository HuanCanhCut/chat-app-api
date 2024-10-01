import express from 'express'
const router = express.Router()

import UserController from '../app/controllers/UserController'
import verifyToken from '~/app/middlewares/verifyToken'

router.get('/:nickname', UserController.getAnUser)
router.post('/:id/add', verifyToken, UserController.addFriend.bind(UserController))

export default router
