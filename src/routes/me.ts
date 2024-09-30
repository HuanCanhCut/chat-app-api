import express from 'express'
const router = express.Router()

import MeController from '../app/controllers/MeController'
import verifyToken from '../app/middlewares/verifyToken'
import upload from '~/app/middlewares/multer'

router.get('/', verifyToken, MeController.getCurrentUser.bind(MeController))
router.patch('/update', verifyToken, upload.single('avatar'), MeController.updateCurrentUser.bind(MeController))

export default router
