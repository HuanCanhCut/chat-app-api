import { Response } from 'express'

interface IClearCookie {
    res: Response
    cookies: string[]
    path?: string
}

const clearCookie = ({ res, cookies = [], path = '/' }: IClearCookie) => {
    cookies = cookies.map((cookie) => `${cookie}=; Max-Age=0; path=${path}; sameSite=None; secure; Partitioned`)

    res.setHeader('Set-Cookie', cookies)
}

export default clearCookie
