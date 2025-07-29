import express from 'express'
const router = express.Router()

import MeController from '../app/controllers/MeController'
import upload from '~/app/middlewares/multer'

router.get('/', MeController.getCurrentUser.bind(MeController))
router.patch(
    '/',

    upload.fields([
        { name: 'avatar', maxCount: 1 },
        { name: 'cover_photo', maxCount: 1 },
    ]),
    MeController.updateCurrentUser.bind(MeController),
)
router.patch('/active-status', MeController.updateActiveStatus.bind(MeController))

export default router
