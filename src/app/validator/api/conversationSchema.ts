import { z } from 'zod'

import { TypedRequest } from '../types/request'
import { uuidSchema } from './common'

export const createTempConversationSchema = z.object({
    body: z.object({
        user_id: z.coerce.number().int().positive(),
    }),
})

export const createConversationSchema = z.object({
    body: z.object({
        name: z.string().min(1),
        user_id: z.array(z.coerce.number().int().positive()).min(2, {
            message: 'At least 2 users are required to create a conversation',
        }),
    }),
})

export const renameConversationSchema = z.object({
    body: z.object({
        name: z.string().min(1),
    }),
    params: uuidSchema.shape.params,
})

export const changeConversationThemeSchema = z.object({
    body: z.object({
        theme_id: z.coerce.number().int().positive(),
    }),
    params: uuidSchema.shape.params,
})

export const changeConversationEmojiSchema = z.object({
    body: z.object({
        emoji: z.string().min(1),
    }),
    params: uuidSchema.shape.params,
})

export const changeConversationMemberNicknameSchema = z.object({
    body: z.object({
        nickname: z.string().min(1),
        user_id: z.coerce.number().int().positive(),
    }),
    params: uuidSchema.shape.params,
})

export const designateLeaderSchema = z.object({
    body: z.object({
        user_id: z.coerce.number().int().positive(),
    }),
    params: uuidSchema.shape.params,
})

export const removeLeaderSchema = z.object({
    body: z.object({
        user_id: z.coerce.number().int().positive(),
    }),
    params: uuidSchema.shape.params,
})

export const removeUserFromConversationSchema = z.object({
    params: uuidSchema.shape.params.extend({
        member_id: z.coerce.number().int().positive().transform(String),
    }),
})

export type CreateTempConversationRequest = TypedRequest<z.infer<typeof createTempConversationSchema>['body']>
export type CreateConversationRequest = TypedRequest<z.infer<typeof createConversationSchema>['body']>
export type RenameConversationRequest = TypedRequest<
    z.infer<typeof renameConversationSchema>['body'],
    z.infer<typeof renameConversationSchema>['params']
>
export type ChangeConversationThemeRequest = TypedRequest<
    z.infer<typeof changeConversationThemeSchema>['body'],
    z.infer<typeof changeConversationThemeSchema>['params']
>
export type ChangeConversationEmojiRequest = TypedRequest<
    z.infer<typeof changeConversationEmojiSchema>['body'],
    z.infer<typeof changeConversationEmojiSchema>['params']
>
export type ChangeConversationMemberNicknameRequest = TypedRequest<
    z.infer<typeof changeConversationMemberNicknameSchema>['body'],
    z.infer<typeof changeConversationMemberNicknameSchema>['params']
>

export type DesignateLeaderRequest = TypedRequest<
    z.infer<typeof designateLeaderSchema>['body'],
    z.infer<typeof designateLeaderSchema>['params']
>
export type RemoveLeaderRequest = TypedRequest<
    z.infer<typeof removeLeaderSchema>['body'],
    z.infer<typeof removeLeaderSchema>['params']
>
export type RemoveUserFromConversationRequest = TypedRequest<
    any,
    z.infer<typeof removeUserFromConversationSchema>['params']
>
