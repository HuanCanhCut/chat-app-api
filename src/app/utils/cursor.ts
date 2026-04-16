export const encodeCursor = <T>(payload: T): string | null => {
    if (payload === null || payload === undefined) return null

    const str = typeof payload === 'string' ? payload : JSON.stringify(payload)
    return Buffer.from(str).toString('base64url')
}

export const decodeCursor = <T>(cursor: string | null | undefined): T => {
    if (!cursor) return {} as T

    try {
        const str = Buffer.from(cursor, 'base64url').toString('utf-8')
        try {
            return JSON.parse(str) as T
        } catch {
            return str as unknown as T
        }
    } catch {
        return {} as T
    }
}
