import { z } from 'zod'

import { TypedRequest } from '../types/request'
import { emailSchema } from './common'

export const registerSchema = z.object({
    body: z.object({
        email: emailSchema,
        password: z.string().min(6),
    }),
})

export const loginSchema = z.object({
    body: {
        ...registerSchema.shape.body,
    },
})

export const loginWithTokenSchema = z.object({
    body: z.object({
        token: z.string().min(1),
    }),
})

export const sendVerifyCodeSchema = z.object({
    body: z.object({
        email: emailSchema,
    }),
})

export const resetPasswordSchema = z.object({
    body: z.object({
        email: emailSchema,
        code: z.string().min(1),
        password: z.string().min(6),
    }),
})

export type RegisterRequest = TypedRequest<z.infer<typeof registerSchema>['body']>
export type LoginRequest = TypedRequest<z.infer<typeof loginSchema>['body']>
export type LoginWithTokenRequest = TypedRequest<z.infer<typeof loginWithTokenSchema>['body']>
export type SendVerifyCodeRequest = TypedRequest<z.infer<typeof sendVerifyCodeSchema>['body']>
export type ResetPasswordRequest = TypedRequest<z.infer<typeof resetPasswordSchema>['body']>
