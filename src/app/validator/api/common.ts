import { z } from 'zod'

import { TypedRequest } from '~/app/validator/types/request'

export const emailSchema = z.string().trim().pipe(z.email())

export const paginationSchema = z.object({
    query: z.object({
        page: z.coerce.number().min(1).transform(String),
        per_page: z.coerce.number().min(1).transform(String),
    }),
})

export const idSchema = z.object({
    params: z.object({
        id: z.coerce.number().int().positive().transform(String),
    }),
})

export const uuidSchema = z.object({
    params: z.object({
        uuid: z.uuidv4(),
    }),
})

export const querySchema = z.object({
    query: z.object({
        q: z.string().min(1),
    }),
})

export type QueryRequest = TypedRequest<any, any, z.infer<typeof querySchema>['query']>
export type PaginationRequest = TypedRequest<any, any, z.infer<typeof paginationSchema>['query']>
export type IdRequest = TypedRequest<any, z.infer<typeof idSchema>['params']>
export type UuidRequest = TypedRequest<any, z.infer<typeof uuidSchema>['params']>
