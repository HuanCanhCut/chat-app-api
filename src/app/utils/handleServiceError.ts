import { AppError, InternalServerError } from '../errors/errors'

export const handleServiceError = (error: any): never => {
    if (error instanceof AppError) {
        throw error
    }

    throw new InternalServerError({ message: error.message + ' ' + error.stack })
}
