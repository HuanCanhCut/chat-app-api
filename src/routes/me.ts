import express from 'express'
const router = express.Router()

import MeController from '../app/controllers/MeController'
import upload from '~/app/middlewares/multer'

router.get('/', MeController.getCurrentUser.bind(MeController))
router.patch(
    '/update',

    upload.fields([
        { name: 'avatar', maxCount: 1 },
        { name: 'cover_photo', maxCount: 1 },
    ]),
    MeController.updateCurrentUser.bind(MeController),
)

export default router
