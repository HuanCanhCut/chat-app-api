export const REACTIONABLE_TYPE = ['Post', 'Comment', 'Message'] as const

export type ReactionableType = (typeof REACTIONABLE_TYPE)[number]

export const BASE_REACTION = ['1f44d', '2764-fe0f', '1f970', '1f602', '1f62e', '1f622', '1f621'] as const // like, tym, thương thương, wow, haha, buồn, phẫn nộ

export type BaseReactionUnified = (typeof BASE_REACTION)[number]
