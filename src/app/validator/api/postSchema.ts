import { z } from 'zod'

import { TypedRequest } from '../types/request'
import { idSchema, paginationSchema } from './common'

export const createPostSchema = z.object({
    body: z
        .object({
            caption: z.string().optional(),
            media_url: z.string().optional(),
            media_type: z.enum(['video', 'image']).optional(),
            is_public: z.enum(['true', 'false']),
        })
        .refine((data) => data.caption || data.media_url, {
            message: 'Phải có ít nhất caption hoặc media_url',
            path: [],
        }),
})

export const getPostReactionsSchema = z.object({
    params: idSchema.shape.params,
    query: paginationSchema.shape.query.extend({
        type: z.string().optional(),
    }),
})

export type CreatePostRequest = TypedRequest<z.infer<typeof createPostSchema>['body']>
export type GetPostReactionsRequest = TypedRequest<
    any,
    z.infer<typeof getPostReactionsSchema>['params'],
    z.infer<typeof getPostReactionsSchema>['query']
>
