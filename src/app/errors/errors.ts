import { StatusCodes, ReasonPhrases } from 'http-status-codes'

interface Message {
    message: string
}

class AppError extends Error {
    statusCode: number
    error: any
    isOperational: boolean

    constructor(message: string, statusCode: number, error = {}) {
        super(message)
        this.statusCode = statusCode
        this.error = error
        this.isOperational = true

        Error.captureStackTrace(this, this.constructor)
    }
}

// 400: Bad Request
class BadRequestError extends AppError {
    constructor({ message = ReasonPhrases.BAD_REQUEST }: Message) {
        super(message, StatusCodes.BAD_REQUEST)
    }
}

// 401: Unauthorized
class UnauthorizedError extends AppError {
    constructor({ message = ReasonPhrases.UNAUTHORIZED }: Message) {
        super(message, StatusCodes.UNAUTHORIZED)
    }
}

// 403: ForBidden
class ForBiddenError extends AppError {
    constructor({ message = ReasonPhrases.FORBIDDEN }: Message) {
        super(message, StatusCodes.FORBIDDEN)
    }
}

// 404: Not Found
class NotFoundError extends AppError {
    constructor({ message = ReasonPhrases.NOT_FOUND }: Message) {
        super(message, StatusCodes.NOT_FOUND)
    }
}

// 409: Conflict
class ConflictError extends AppError {
    constructor({ message = ReasonPhrases.CONFLICT }: Message) {
        super(message, StatusCodes.CONFLICT)
    }
}

interface ErrorProps extends Message {
    error?: any
}

// 422: Unprocessable Entity
class UnprocessableEntityError extends AppError {
    constructor({ message = ReasonPhrases.UNPROCESSABLE_ENTITY, error = {} }: ErrorProps) {
        super(message, StatusCodes.UNPROCESSABLE_ENTITY, error)
    }
}

// 500 : Internal Server Error
class InternalServerError extends AppError {
    constructor({ message = 'Internal Server Error' }: Message) {
        super(message, 500)
    }
}

export {
    UnauthorizedError,
    ForBiddenError,
    NotFoundError,
    UnprocessableEntityError,
    ConflictError,
    BadRequestError,
    InternalServerError,
}
