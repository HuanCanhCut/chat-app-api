import { NextFunction } from 'express'

import userContext from '../utils/userContext'
import { IRequest } from '~/type'

const setUserContextMiddleware = (req: IRequest, res: any, next: NextFunction) => {
    if (req.decoded?.sub) {
        userContext.run(
            {
                currentUserId: req.decoded.sub,
                requestId:
                    req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date(),
                ip: req.ip,
                userAgent: req.get('User-Agent'),
            },
            () => {
                next()
            },
        )
    } else {
        next()
    }
}

export default setUserContextMiddleware
