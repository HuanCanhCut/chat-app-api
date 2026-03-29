import { z } from 'zod'

import { TypedRequest } from '../types/request'

export const cursorSchema = z.object({
    query: z.object({
        cursor: z.base64({ error: 'cursor must be a valid base64 string' }).optional(),
        limit: z.coerce.number().int().min(1).max(100).default(10).transform(String),
    }),
})

export type CursorRequest = TypedRequest<any, any, z.infer<typeof cursorSchema>['query']>
