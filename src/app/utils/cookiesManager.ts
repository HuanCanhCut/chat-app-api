import { Request, Response } from 'express'
import psl from 'psl'

interface IClearCookie {
    res: Response
    cookies: string[]
    path?: string
    req: Request
}

const getParentDomain = (hostname: string): string => {
    const parsed = psl.parse(hostname)

    // if parsed.domain is not undefined, return parsed.domain
    if ('domain' in parsed && parsed.domain) {
        return parsed.domain
    }

    return hostname
}

export const clearCookie = ({ res, cookies = [], path = '/', req }: IClearCookie) => {
    const origin = req.headers.origin || req.headers.referer
    const hostname = origin ? new URL(origin).hostname : undefined
    const domain = hostname ? `.${getParentDomain(hostname)}` : undefined

    for (const cookie of cookies) {
        res.cookie(cookie, '', {
            httpOnly: true,
            path,
            sameSite: 'strict',
            secure: true,
            partitioned: true,
            maxAge: 0,
            domain: domain,
        })
    }
}

interface ISetCookie {
    res: Response
    cookies: { name: string; value: string; maxAge: number }[]
    path?: string
    req: Request
}

export const setCookie = ({ res, cookies = [], path = '/', req }: ISetCookie) => {
    const origin = req.headers.origin || req.headers.referer
    const hostname = origin ? new URL(origin).hostname : undefined
    const domain = hostname ? `.${getParentDomain(hostname)}` : undefined

    for (const cookie of cookies) {
        res.cookie(cookie.name, cookie.value, {
            httpOnly: true,
            path,
            sameSite: 'strict',
            secure: true,
            partitioned: true,
            domain: domain,
            maxAge: cookie.maxAge,
        })
    }
}
