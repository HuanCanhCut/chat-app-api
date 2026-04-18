import { z } from 'zod'

import { TypedRequest } from '../types/request'
import { cursorField, idSchema, limitSchema, paginationSchema } from './common'
import { BASE_REACTION } from '~/types/reactionType'

const getPostCursorSchema = z.object({
    last_id: z.number(),
    score: z.number(),
})

type GetPostCursorQuery = z.infer<typeof getPostCursorSchema>

const getPostsSchema = z.object({
    query: limitSchema.shape.query.extend({
        cursor: cursorField(getPostCursorSchema),
    }),
})

const createPostSchema = z.object({
    body: z
        .object({
            caption: z.string().optional(),
            media: z
                .array(
                    z.object({
                        media_url: z.string(),
                        media_type: z.enum(['video', 'image']),
                    }),
                )
                .optional(),
            is_public: z.boolean(),
        })
        .refine((data) => data.caption || (data.media && data.media.length > 0), {
            message: 'Phải có ít nhất caption hoặc media_url',
            path: [],
        }),
})

const getPostReactionsSchema = z.object({
    params: idSchema.shape.params,
    query: paginationSchema.shape.query.extend({
        type: z.string().optional(),
    }),
})

const reactPostSchema = z.object({
    body: z.object({
        unified: z.enum(BASE_REACTION),
    }),
    params: idSchema.shape.params,
})

type GetPostsRequest = TypedRequest<any, any, z.infer<typeof getPostsSchema>['query']>
type CreatePostRequest = TypedRequest<z.infer<typeof createPostSchema>['body']>
type GetPostReactionsRequest = TypedRequest<
    any,
    z.infer<typeof getPostReactionsSchema>['params'],
    z.infer<typeof getPostReactionsSchema>['query']
>
type ReactPostRequest = TypedRequest<z.infer<typeof reactPostSchema>['body'], z.infer<typeof reactPostSchema>['params']>

export {
    CreatePostRequest,
    createPostSchema,
    GetPostCursorQuery,
    GetPostReactionsRequest,
    getPostReactionsSchema,
    GetPostsRequest,
    getPostsSchema,
    ReactPostRequest,
    reactPostSchema,
}
