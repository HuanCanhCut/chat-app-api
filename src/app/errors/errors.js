const { StatusCodes, ReasonPhrases } = require('http-status-codes')

class AppError extends Error {
    constructor(message, statusCode, error = {}) {
        super(message)
        this.statusCode = statusCode
        this.error = error
        this.isOperational = true

        Error.captureStackTrace(this, this.constructor)
    }
}

// 400: Bad Request
class BadRequest extends AppError {
    constructor(message = ReasonPhrases.BAD_REQUEST) {
        super(message, StatusCodes.BAD_REQUEST)
    }
}

// 401: Unauthorized
class UnauthorizedError extends AppError {
    constructor(message = ReasonPhrases.UNAUTHORIZED) {
        super(message, StatusCodes.UNAUTHORIZED)
    }
}

// 403: ForBidden
class ForBiddenError extends AppError {
    constructor(message = ReasonPhrases.FORBIDDEN) {
        super(message, StatusCodes.FORBIDDEN)
    }
}

// 404: Not Found
class NotFoundError extends AppError {
    constructor(message = ReasonPhrases.NOT_FOUND) {
        super(message, StatusCodes.NOT_FOUND)
    }
}

// 409: Conflict
class ConflictError extends AppError {
    constructor(message = ReasonPhrases.CONFLICT) {
        super(message, StatusCodes.CONFLICT)
    }
}

// 422: Unprocessable Entity
class UnprocessableEntityError extends AppError {
    constructor(message = ReasonPhrases.UNPROCESSABLE_ENTITY, error = {}) {
        super(message, StatusCodes.UNPROCESSABLE_ENTITY, error)
    }
}

// 500: Internal Server Error
class InternalServerError extends AppError {
    constructor(message = 'Something went wrong!') {
        super(message, StatusCodes.INTERNAL_SERVER_ERROR)
    }
}

module.exports = {
    UnauthorizedError,
    ForBiddenError,
    NotFoundError,
    InternalServerError,
    BadRequest,
    ConflictError,
    UnprocessableEntityError,
}
