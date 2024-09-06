const logger = require('../../logger/logger')

const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500
    err.status = err.status || 'error'
    err.error = err.error || {}

    if (err.statusCode.toString().startsWith('5')) {
        logger.error(
            `Error occurred: ${err.message}\nStack trace: ${err.stack}\n Request: ${JSON.stringify(
                req.body
            )} \n Response: ${JSON.stringify(res.body)} \n Error code: ${err.statusCode}`
        )

        return
    }

    return res.status(err.statusCode).json({
        status_code: err.statusCode,
        message: err.statusCode.toString().startsWith('5') ? 'Something went wrong!' : err.message,
        error: err.error,
    })
}

module.exports = errorHandler
