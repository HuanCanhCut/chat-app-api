import { z } from 'zod'

import { TypedRequest } from '../types/request'
import { paginationSchema, uuidSchema } from './common'
import { BASE_REACTION } from '~/types/reactionType'

export const getUserViewedStorySchema = z.object({
    query: paginationSchema.shape.query,
    params: uuidSchema.shape.params,
})

export const createStorySchema = z.object({
    body: z.object({
        url: z.url({ error: 'Vui lòng nhập url hợp lệ' }),
        type: z.enum(['image', 'video', 'text'], { error: 'Vui lòng chọn type là image, video hoặc text' }),
        caption: z.string().optional(),
    }),
})

export const reactToStorySchema = z.object({
    body: z.object({
        unified: z.enum(BASE_REACTION),
    }),
    params: uuidSchema.shape.params,
})

export type GetUserViewedStoryRequest = TypedRequest<
    z.infer<typeof getUserViewedStorySchema>['query'],
    z.infer<typeof getUserViewedStorySchema>['params']
>
export type CreateStoryRequest = TypedRequest<z.infer<typeof createStorySchema>['body']>
export type ReactToStoryRequest = TypedRequest<
    z.infer<typeof reactToStorySchema>['body'],
    z.infer<typeof reactToStorySchema>['params']
>
