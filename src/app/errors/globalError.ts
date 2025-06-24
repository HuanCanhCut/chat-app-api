import logger from '~/logger/logger'

export default function setupGlobalErrorHandling() {
    process.on('uncaughtException', (err) => {
        logger.error(`Uncaught Exception: ${err.stack || err}`)
        process.exit(1)
    })

    process.on('unhandledRejection', (reason) => {
        logger.error(`Unhandled Rejection: ${reason}`)
        process.exit(1)
    })
}
