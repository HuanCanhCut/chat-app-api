import { NextFunction, Request } from 'express'
import jwt from 'jsonwebtoken'
import clearCookie from '../utils/clearCookies'
import dotenv from 'dotenv'

dotenv.config()

const verifyToken = async (req: Request, res: any, next: NextFunction) => {
    try {
        const { token } = req.cookies

        if (!token) {
            clearCookie({ res, cookies: ['token', 'refreshToken'] })
            res.status(401).json({
                message: 'Failed to authenticate because of bad credentials or an invalid authorization header.',
                status: 401,
            })
            return
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET as string)

        req.decoded = decoded
        next()
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
        clearCookie({ res, cookies: ['token', 'refreshToken'] })
        return res.status(401).json({
            message: 'Token signature could not be verified.',
            status: 401,
        })
    }
}

export default verifyToken
