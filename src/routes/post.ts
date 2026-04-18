import express from 'express'

import CommentController from '~/app/controllers/CommentController'
import PostController from '~/app/controllers/PostController'
import { validate } from '~/app/middlewares/validate'
import { getPostCommentsSchema } from '~/app/validator/api/commentSchema'
import { idSchema } from '~/app/validator/api/common'
import {
    createPostSchema,
    getPostReactionsSchema,
    getPostsSchema,
    reactPostSchema,
} from '~/app/validator/api/postSchema'

const router = express.Router()

router.get('/', validate(getPostsSchema), PostController.getPosts)
router.post('/', validate(createPostSchema), PostController.createPost)
router.get('/:id/reactions', validate(getPostReactionsSchema), PostController.getPostReactions)
router.get('/:id/comments', validate(getPostCommentsSchema), CommentController.getPostComments)

router.get('/:id', validate(idSchema), PostController.getPostById)
router.post('/:id/react', validate(reactPostSchema), PostController.reactPost)
router.delete('/:id/unreact', validate(idSchema), PostController.unreactPost)

export default router
