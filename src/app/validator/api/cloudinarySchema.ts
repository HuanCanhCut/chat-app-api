import { z } from 'zod'

import { TypedRequest } from '../types/request'

export const cloudinarySignatureSchema = z.object({
    body: z.object({
        folder: z.string(),
    }),
})

export type CreateCloudinarySignatureRequest = TypedRequest<z.infer<typeof cloudinarySignatureSchema>['body']>
