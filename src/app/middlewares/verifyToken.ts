import { NextFunction } from 'express'
import jwt from 'jsonwebtoken'

import clearCookie from '../utils/clearCookies'
import redisClient from '~/config/redis/redisClient'
import { IRequest } from '~/type'

const verifyToken = async (req: IRequest, res: any, next: NextFunction) => {
    try {
        const { access_token } = req.cookies

        const tokenInvalid = await redisClient.get(`blacklist-${access_token}`)

        if (tokenInvalid) {
            clearCookie({ res, cookies: ['access_token', 'refresh_token'] })

            return res.status(401).json({
                message: 'Failed to authenticate because of bad credentials or an invalid authorization header.',
                status: 401,
            })
        }

        try {
            const decoded = jwt.verify(access_token, process.env.JWT_SECRET as string)

            req.decoded = decoded

            next()
        } catch (error) {
            if (error instanceof jwt.JsonWebTokenError) {
                if (error.name === 'TokenExpiredError') {
                    return res.status(401).set('x-refresh-token-required', 'true').json({
                        error: 'Failed to authenticate because of expired token.',
                        code: 'TOKEN_EXPIRED',
                    })
                } else {
                    clearCookie({ res, cookies: ['access_token', 'refresh_token'] })

                    return res.status(401).json({
                        error: 'Failed to authenticate because of bad credentials or an invalid authorization header.',
                        code: 'TOKEN_VERIFICATION_FAILED',
                    })
                }
            } else {
                throw error
            }
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
        clearCookie({ res, cookies: ['access_token', 'refresh_token'] })

        return res.status(401).json({
            message: 'Token signature could not be verified.',
            status: 401,
        })
    }
}

export default verifyToken
