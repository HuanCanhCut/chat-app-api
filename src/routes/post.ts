import express from 'express'

import PostController from '~/app/controllers/PostController'
import { validate } from '~/app/middlewares/validate'
import { paginationSchema } from '~/app/validator/api/common'
import { createPostSchema } from '~/app/validator/api/postSchema'

const router = express.Router()

router.get('/', validate(paginationSchema), PostController.getPosts)
router.post('/', validate(createPostSchema), PostController.createPost)

export default router
