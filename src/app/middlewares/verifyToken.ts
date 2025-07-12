import { NextFunction } from 'express'
import jwt from 'jsonwebtoken'

import clearCookie from '../utils/clearCookies'
import redisClient from '~/config/redis/redisClient'
import { IRequest } from '~/type'

const verifyToken = async (req: IRequest, res: any, next: NextFunction) => {
    try {
        const { access_token } = req.cookies

        const handleError = () => {
            clearCookie({ res, cookies: ['access_token', 'refresh_token'] })

            return res.status(401).json({
                message: 'Failed to authenticate because of bad credentials or an invalid authorization header.',
                status: 401,
            })
        }

        if (!access_token) {
            return handleError()
        }

        const tokenInvalid = await redisClient.get(`blacklist-${access_token}`)

        if (tokenInvalid) {
            handleError()
        }

        const decoded = jwt.verify(access_token, process.env.JWT_SECRET as string)

        if (!decoded) {
            handleError()
        }

        req.decoded = decoded

        next()
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
