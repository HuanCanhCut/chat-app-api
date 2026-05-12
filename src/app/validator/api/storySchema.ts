import { z } from 'zod'

import { TypedRequest } from '../types/request'
import { cursorField, lastIdSchema, limitSchema, paginationSchema, uuidSchema } from './common'
import { BASE_REACTION } from '~/types/reactionType'

const getStoriesSchema = z.object({
    query: limitSchema.shape.query.extend({
        cursor: cursorField(lastIdSchema),
    }),
})

const getUserViewedStorySchema = z.object({
    query: paginationSchema.shape.query,
    params: uuidSchema.shape.params,
})

const createStorySchema = z.object({
    body: z.object({
        url: z.url({ error: 'Vui lòng nhập url hợp lệ' }),
        type: z.enum(['image', 'video', 'text'], { error: 'Vui lòng chọn type là image, video hoặc text' }),
        caption: z.string().optional(),
    }),
})

const reactToStorySchema = z.object({
    body: z.object({
        unified: z.enum(BASE_REACTION),
    }),
    params: uuidSchema.shape.params,
})

type GetStoriesQuery = z.infer<typeof getStoriesSchema>['query']
type GetUserViewedStoryRequest = TypedRequest<
    z.infer<typeof getUserViewedStorySchema>['query'],
    z.infer<typeof getUserViewedStorySchema>['params']
>
type CreateStoryRequest = TypedRequest<z.infer<typeof createStorySchema>['body']>
type ReactToStoryRequest = TypedRequest<
    z.infer<typeof reactToStorySchema>['body'],
    z.infer<typeof reactToStorySchema>['params']
>
type GetStoriesRequest = TypedRequest<z.infer<typeof getStoriesSchema>['query']>

export {
    CreateStoryRequest,
    createStorySchema,
    GetStoriesQuery,
    GetStoriesRequest,
    getStoriesSchema,
    GetUserViewedStoryRequest,
    getUserViewedStorySchema,
    ReactToStoryRequest,
    reactToStorySchema,
}
