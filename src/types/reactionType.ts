export type ReactionableType = 'Post' | 'Comment' | 'Message'

export const POST_REACTIONS = ['1f44d', '2764-fe0f', '1f970', '1f62e', '1f622', '1f621'] as const // like, tym, thương thương, wow, buồn, phẫn nộ

export type PostReactionUnified = (typeof POST_REACTIONS)[number]
