import { z } from 'zod'

import { TypedRequest } from '../types/request'
import { cursorField, idSchema, lastIdSchema, limitSchema } from './common'

const getPostCommentsSchema = z.object({
    params: idSchema.shape.params,
    query: limitSchema.shape.query.extend({
        parent_id: z.string().optional(),
        cursor: cursorField(lastIdSchema),
    }),
})

const createCommentSchema = z.object({
    body: z.object({
        content: z.string(),
        parent_id: z.coerce.number().int().positive().optional(),
    }),
    params: idSchema.shape.params,
})

type GetPostCommentRequest = TypedRequest<any, any, z.infer<typeof getPostCommentsSchema>['query']>
type CreateCommentRequest = TypedRequest<
    z.infer<typeof createCommentSchema>['body'],
    z.infer<typeof createCommentSchema>['params']
>

export { CreateCommentRequest, createCommentSchema, GetPostCommentRequest, getPostCommentsSchema }
