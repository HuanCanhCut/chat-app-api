import { z } from 'zod'

import { TypedRequest } from '../types/request'

export const createStorySchema = z.object({
    body: z.object({
        url: z.url({ error: 'Vui lòng nhập url hợp lệ' }),
        type: z.enum(['image', 'video'], { error: 'Vui lòng chọn type là image hoặc video' }),
    }),
})

export type CreateStoryRequest = TypedRequest<z.infer<typeof createStorySchema>['body']>
