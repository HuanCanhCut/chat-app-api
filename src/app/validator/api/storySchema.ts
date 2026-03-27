import { z } from 'zod'

import { TypedRequest } from '../types/request'
import { idSchema } from './common'
import { BASE_REACTION } from '~/types/reactionType'

export const createStorySchema = z.object({
    body: z
        .object({
            url: z.url({ error: 'Vui lòng nhập url hợp lệ' }),
            type: z.enum(['image', 'video', 'text'], { error: 'Vui lòng chọn type là image, video hoặc text' }),
            background_url: z.string().optional(),
        })
        .refine(
            (data) => {
                if (data.type === 'text') {
                    return !!data.background_url
                }
                return true
            },
            {
                message: 'Type text bắt buộc phải có background',
                path: ['background_url'],
            },
        ),
})

export const reactToStorySchema = z.object({
    body: z.object({
        unified: z.enum(BASE_REACTION),
    }),
    params: idSchema.shape.params,
})

export type CreateStoryRequest = TypedRequest<z.infer<typeof createStorySchema>['body']>
export type ReactToStoryRequest = TypedRequest<
    z.infer<typeof reactToStorySchema>['body'],
    z.infer<typeof reactToStorySchema>['params']
>
