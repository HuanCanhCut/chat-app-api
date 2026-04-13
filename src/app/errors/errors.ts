import { ReasonPhrases, StatusCodes } from 'http-status-codes'

interface Message {
    message: string
}

class AppError extends Error {
    statusCode: number
    error: any

    constructor(message: string, statusCode: number, error = {}) {
        super(message)
        this.statusCode = statusCode
        this.error = error

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

// 429: Too Many Requests
class TooManyRequestsError extends AppError {
    constructor({ message = ReasonPhrases.TOO_MANY_REQUESTS, error = {} }: ErrorProps) {
        super(message, StatusCodes.TOO_MANY_REQUESTS, error)
    }
}

// 500: Internal Server Error
class InternalServerError extends AppError {
    constructor({ message = ReasonPhrases.INTERNAL_SERVER_ERROR, error = {} }: ErrorProps) {
        super(message, StatusCodes.INTERNAL_SERVER_ERROR, error)
    }
}

// 501: Not Implemented
class NotImplementedError extends AppError {
    constructor({ message = ReasonPhrases.NOT_IMPLEMENTED, error = {} }: ErrorProps) {
        super(message, StatusCodes.NOT_IMPLEMENTED, error)
    }
}

// 502: Bad Gateway
class BadGatewayError extends AppError {
    constructor({ message = ReasonPhrases.BAD_GATEWAY, error = {} }: ErrorProps) {
        super(message, StatusCodes.BAD_GATEWAY, error)
    }
}

// 503: Service Unavailable
class ServiceUnavailableError extends AppError {
    constructor({ message = ReasonPhrases.SERVICE_UNAVAILABLE, error = {} }: ErrorProps) {
        super(message, StatusCodes.SERVICE_UNAVAILABLE, error)
    }
}

// 504: Gateway Timeout
class GatewayTimeoutError extends AppError {
    constructor({ message = ReasonPhrases.GATEWAY_TIMEOUT, error = {} }: ErrorProps) {
        super(message, StatusCodes.GATEWAY_TIMEOUT, error)
    }
}

export {
    AppError,
    BadGatewayError,
    BadRequestError,
    ConflictError,
    ForBiddenError,
    GatewayTimeoutError,
    InternalServerError,
    NotFoundError,
    NotImplementedError,
    ServiceUnavailableError,
    TooManyRequestsError,
    UnauthorizedError,
    UnprocessableEntityError,
}
