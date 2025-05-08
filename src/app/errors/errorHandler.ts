import { NextFunction, Request } from 'express'
import logger from '../../logger/logger'

interface CustomError extends Error {
    statusCode: number
    status: string
    error: any
}

const errorHandler = (err: CustomError, req: Request, res: any, next: NextFunction) => {
    err.statusCode = err.statusCode || 500
    err.status = err.status || 'error'
    err.error = err.error || {}

    if (err.statusCode.toString().startsWith('5')) {
        logger.error(
            `Error occurred: ${err.message}\nStack trace: ${err.stack}\nRequest: ${JSON.stringify(
                req.body,
            )} \nError code: ${err.statusCode}`,
        )
    }

    return res.status(err.statusCode).json({
        status_code: err.statusCode,
        message:
            err.statusCode.toString().startsWith('5') && process.env.NODE_ENV === 'production'
                ? 'Something went wrong!'
                : err.message,
        error: err.error,
    })
}

export default errorHandler
