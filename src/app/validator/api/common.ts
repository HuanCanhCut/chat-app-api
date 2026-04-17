import { z } from 'zod'

import { decodeCursor } from '~/app/utils/cursor'
import { TypedRequest } from '~/app/validator/types/request'

const emailSchema = z.string().trim().pipe(z.email())

const idSchema = z.object({
    params: z.object({
        id: z.coerce.number().int().positive().transform(String),
    }),
})

const uuidSchema = z.object({
    params: z.object({
        uuid: z.uuidv4(),
    }),
})

const querySchema = z.object({
    query: z.object({
        q: z.string().min(1),
    }),
})

const lastIdSchema = z.object({
    last_id: z.coerce
        .number()
        .int({ error: 'last_id must be an integer' })
        .positive({ error: 'last_id must be a positive number' }),
})

const limitSchema = z.object({
    query: z.object({
        limit: z.coerce.number().int().min(1).max(100).default(10).transform(String),
    }),
})

const cursorField = <T extends z.ZodTypeAny>(cursorSchema: T) =>
    z
        .string()
        .superRefine((val, ctx) => {
            try {
                const decoded = decodeCursor(val)
                const result = cursorSchema.safeParse(decoded)

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
        .optional()

const paginationSchema = z.object({
    query: z.object({
        page: z.coerce.number().min(1).transform(String),
        per_page: z.coerce.number().min(1).transform(String),
    }),
})

type LastIdType = z.infer<typeof lastIdSchema>
type QueryRequest = TypedRequest<any, any, z.infer<typeof querySchema>['query']>
type PaginationRequest = TypedRequest<any, any, z.infer<typeof paginationSchema>['query']>
type IdRequest = TypedRequest<any, z.infer<typeof idSchema>['params']>
type UuidRequest = TypedRequest<any, z.infer<typeof uuidSchema>['params']>

export {
    cursorField,
    emailSchema,
    IdRequest,
    idSchema,
    lastIdSchema,
    LastIdType,
    limitSchema,
    PaginationRequest,
    paginationSchema,
    QueryRequest,
    querySchema,
    UuidRequest,
    uuidSchema,
}
