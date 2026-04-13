import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import moment from 'moment-timezone'

import logger from '../../logger/logger'

interface CustomError extends Error {
    statusCode: number
    status: string
    error: any
}

interface AuthPayload {
    [key: string]: any
}

const buildLogMessage = (req: Request, res: Response, err: CustomError): string => {
    const vietnamTime = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss.SSS')

    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || '-'

    const reqHeaders = { ...req.headers }

    let authLog = '-'
    if (reqHeaders['authorization']) {
        try {
            const token = (reqHeaders['authorization'] as string).replace(/^Bearer\s+/i, '')
            const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as unknown as AuthPayload
            authLog = JSON.stringify(decoded, null, 2)
        } catch {
            authLog = 'invalid or expired token'
        }
        delete reqHeaders['authorization']
    }

    if (reqHeaders['cookie']) reqHeaders['cookie'] = '***MASKED***'

    const body = req.body && Object.keys(req.body).length ? JSON.stringify(req.body, null, 2) : '-'
    const query = Object.keys(req.query).length ? JSON.stringify(req.query, null, 2) : '-'
    const params = Object.keys(req.params).length ? JSON.stringify(req.params, null, 2) : '-'

    return [
        ` ==============================================================================`,
        `${vietnamTime}`,
        `[error]: 🔴 ${req.method} ${req.originalUrl} ${err.statusCode}`,
        ``,
        `  IP          : ${ip}`,
        `  User-Agent  : ${req.headers['user-agent'] || '-'}`,
        `  Content-Type: ${req.headers['content-type'] || '-'}`,
        `  Referrer    : ${req.headers['referer'] || req.headers['referrer'] || '-'}`,
        ``,
        `  Params      : ${params}`,
        `  Query       : ${query}`,
        `  Body        : ${body}`,
        ``,
        `  JWT         : ${authLog}`,
        `  Req Headers : ${JSON.stringify(reqHeaders, null, 2)}`,
        `  Res Headers : ${JSON.stringify(res.getHeaders(), null, 2)}`,
        ``,
        `  Error       : ${err.message}`,
        `  Stack       :`,
        `${err.stack}`,
        `    `,
    ].join('\n')
}

const errorHandler = (err: CustomError, req: Request, res: Response, next: NextFunction) => {
    err.statusCode = err.statusCode || 500
    err.status = err.status || 'error'
    err.error = err.error || {}

    if (err.statusCode.toString().startsWith('5')) {
        logger.error(buildLogMessage(req, res, err))
    }

    res.status(err.statusCode).json({
        status_code: err.statusCode,
        message:
            err.statusCode.toString().startsWith('5') && process.env.NODE_ENV === 'production'
                ? 'Something went wrong!'
                : err.message,
        error: err.error,
    })
}

export default errorHandler
