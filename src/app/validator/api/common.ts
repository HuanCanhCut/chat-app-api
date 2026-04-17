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
        .base64url({ error: 'cursor must be a valid base64url string' })
        .superRefine((val, ctx) => {
            const addInvalidError = () =>
                ctx.addIssue({
                    code: 'custom',
                    message: 'cursor must be a valid base64url string',
                })

            try {
                const decoded = decodeCursor(val)

                if (typeof decoded !== 'object' || decoded === null || Array.isArray(decoded)) {
                    return addInvalidError()
                }

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
                addInvalidError()
            }
        })
        .optional()

const paginationSchema = z.object({
    query: z.object({
        page: z.coerce.number().min(1).transform(String),
        per_page: z.coerce.number().min(1).transform(String),
    }),
})

type LastIdCursor = z.infer<typeof lastIdSchema>
type QueryRequest = TypedRequest<any, any, z.infer<typeof querySchema>['query']>
type PaginationRequest = TypedRequest<any, any, z.infer<typeof paginationSchema>['query']>
type IdRequest = TypedRequest<any, z.infer<typeof idSchema>['params']>
type UuidRequest = TypedRequest<any, z.infer<typeof uuidSchema>['params']>

export {
    cursorField,
    emailSchema,
    IdRequest,
    idSchema,
    LastIdCursor,
    lastIdSchema,
    limitSchema,
    PaginationRequest,
    paginationSchema,
    QueryRequest,
    querySchema,
    UuidRequest,
    uuidSchema,
}
