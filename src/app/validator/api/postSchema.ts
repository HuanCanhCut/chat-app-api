import { z } from 'zod'

import { TypedRequest } from '../types/request'
import { idSchema, paginationSchema } from './common'
import { decodeCursor } from '~/app/utils/cursor'
import { BASE_REACTION } from '~/types/reactionType'

const getPostCursorSchema = z.object({
    id: z.number(),
    score: z.number(),
})

type GetPostCursorQuery = z.infer<typeof getPostCursorSchema>

const getPostsSchema = z.object({
    query: z.object({
        cursor: z
            .base64({ error: 'cursor must be a valid base64 string' })
            .superRefine((val, ctx) => {
                try {
                    const decoded = decodeCursor(val)
                    const result = getPostCursorSchema.safeParse(decoded)

                    if (!result.success) {
                        result.error.issues.forEach((issue) => {
                            ctx.addIssue({
                                code: 'custom',
                                message: issue.message,
                                path: issue.path,
                            })
                        })
                    }
                } catch {
                    ctx.addIssue({
                        code: 'custom',
                        message: 'Cursor is not valid JSON',
                    })
                }
            })
            .optional(),
        limit: z.coerce.number().int().min(1).max(100).default(10).transform(String),
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

const getPostCommentSchema = z.object({
    params: idSchema.shape.params,
    query: paginationSchema.shape.query.extend({
        parent_id: z.string().optional(),
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
type GetPostCommentsRequest = TypedRequest<
    any,
    z.infer<typeof getPostCommentSchema>['params'],
    z.infer<typeof getPostCommentSchema>['query']
>
type ReactPostRequest = TypedRequest<z.infer<typeof reactPostSchema>['body'], z.infer<typeof reactPostSchema>['params']>

export {
    CreatePostRequest,
    createPostSchema,
    getPostCommentSchema,
    GetPostCommentsRequest,
    GetPostCursorQuery,
    GetPostReactionsRequest,
    getPostReactionsSchema,
    GetPostsRequest,
    getPostsSchema,
    ReactPostRequest,
    reactPostSchema,
}
