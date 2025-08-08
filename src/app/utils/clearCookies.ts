import { Request, Response } from 'express'

interface IClearCookie {
    res: Response
    cookies: string[]
    path?: string
    req: Request
}

const clearCookie = ({ res, cookies = [], path = '/', req }: IClearCookie) => {
    cookies = cookies.map(
        (cookie) =>
            `${cookie}=; Max-Age=0; path=${path}; sameSite=None; secure; Partitioned; domain=${req?.headers.origin?.split('://')[1].split(':')[0]}`,
    )

    res.setHeader('Set-Cookie', cookies)
}

export default clearCookie
