import { z } from 'zod'

import { TypedRequest } from '../types/request'
import { paginationSchema } from './common'
import { REACTIONABLE_TYPE } from '~/types/reactionType'

export const getReactionsTypesSchema = z.object({
    params: z.object({
        reactionableId: z.coerce.number().transform(String),
        reactionableType: z.enum(REACTIONABLE_TYPE),
    }),
})

export const getReactions = z.object({
    params: getReactionsTypesSchema.shape.params,
    query: paginationSchema.shape.query.extend({
        type: z.string().optional(),
    }),
})

export type GetReactionsTypesRequest = TypedRequest<any, z.infer<typeof getReactionsTypesSchema>['params']>
export type GetReactionsRequest = TypedRequest<
    any,
    z.infer<typeof getReactions>['params'],
    z.infer<typeof getReactions>['query']
>
