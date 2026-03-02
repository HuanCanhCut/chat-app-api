import express from 'express'

import PostController from '~/app/controllers/PostController'
import { validate } from '~/app/middlewares/validate'
import verifyToken from '~/app/middlewares/verifyToken'
import { createPostSchema } from '~/app/validator/api/postSchema'

const router = express.Router()

router.post('/', validate(createPostSchema), verifyToken, PostController.createPost)

export default router
