import { z } from 'zod'

import { TypedRequest } from '../types/request'
import { cursorField, lastIdSchema, limitSchema } from './common'

const getCommentCursorSchema = z.object({
    query: lastIdSchema,
})

type GetCommentCursorQuery = z.infer<typeof getCommentCursorSchema>

const getCommentsSchema = z.object({
    query: limitSchema.shape.query.extend({
        cursor: cursorField(getCommentCursorSchema),
    }),
})

type GetCommentsRequest = TypedRequest<any, any, z.infer<typeof getCommentsSchema>['query']>

export { GetCommentCursorQuery, GetCommentsRequest, getCommentsSchema }
