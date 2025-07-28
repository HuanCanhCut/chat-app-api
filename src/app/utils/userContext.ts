import { AsyncLocalStorage } from 'async_hooks'

interface UserContext {
    currentUserId: number | null
    requestId: string | string[]
    timestamp: Date
    ip?: string
    userAgent?: string
}

const userContext = new AsyncLocalStorage<UserContext>()

export const getCurrentUser = () => {
    const store = userContext.getStore()

    return store?.currentUserId || null
}

export const getRequestInfo = () => {
    const store = userContext.getStore()

    return {
        currentUserId: store?.currentUserId || null,
        requestId: store?.requestId || null,
        timestamp: store?.timestamp || null,
        ip: store?.ip || null,
        userAgent: store?.userAgent || null,
    }
}

export default userContext
