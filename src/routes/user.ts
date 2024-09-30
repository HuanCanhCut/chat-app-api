import express from 'express'
const router = express.Router()

import UserController from '../app/controllers/UserController'

router.get('/:nickname', UserController.getAnUser.bind(UserController))

export default router
