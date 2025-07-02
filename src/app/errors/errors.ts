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
    constructor({ message = ReasonPhrases.TOO_MANY_REQUESTS }: Message) {
        super(message, StatusCodes.TOO_MANY_REQUESTS)
    }
}

// 500: Internal Server Error
class InternalServerError extends AppError {
    constructor({ message = ReasonPhrases.INTERNAL_SERVER_ERROR }: Message) {
        super(message, StatusCodes.INTERNAL_SERVER_ERROR)
    }
}

// 501: Not Implemented
class NotImplementedError extends AppError {
    constructor({ message = ReasonPhrases.NOT_IMPLEMENTED }: Message) {
        super(message, StatusCodes.NOT_IMPLEMENTED)
    }
}

// 502: Bad Gateway
class BadGatewayError extends AppError {
    constructor({ message = ReasonPhrases.BAD_GATEWAY }: Message) {
        super(message, StatusCodes.BAD_GATEWAY)
    }
}

// 503: Service Unavailable
class ServiceUnavailableError extends AppError {
    constructor({ message = ReasonPhrases.SERVICE_UNAVAILABLE }: Message) {
        super(message, StatusCodes.SERVICE_UNAVAILABLE)
    }
}

// 504: Gateway Timeout
class GatewayTimeoutError extends AppError {
    constructor({ message = ReasonPhrases.GATEWAY_TIMEOUT }: Message) {
        super(message, StatusCodes.GATEWAY_TIMEOUT)
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
