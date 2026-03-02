import { z } from 'zod'

import { TypedRequest } from '../types/request'

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

export type CreatePostRequest = TypedRequest<z.infer<typeof createPostSchema>['body']>
