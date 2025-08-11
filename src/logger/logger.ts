import fs from 'fs'
import moment from 'moment-timezone'
import path from 'path'
import winston from 'winston'

const { combine, timestamp, printf, colorize } = winston.format

const logDir = 'logs'
const logFile = path.join(logDir, 'error.log')

if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir)
}

const customFormat = printf(({ level, message, timestamp, stack }) => {
    const vietnamTime = moment(timestamp as string)
        .tz('Asia/Ho_Chi_Minh')
        .format('YYYY-MM-DD HH:mm:ss.SSS')

    // Nếu có stack trace, hiển thị cả message và stack
    const logMessage = stack ? `${message}\nStack trace:\n${stack}` : message

    return ` ==============================================================================
${vietnamTime} 
[${level}]: ${logMessage}
    `
})

const winstonLogger = winston.createLogger({
    level: 'error',
    format: combine(timestamp(), customFormat),
    transports: [
        new winston.transports.File({ filename: logFile, level: 'error' }),
        new winston.transports.Console({
            format: combine(colorize({ all: true, colors: { error: 'red' } }), timestamp(), customFormat),
        }),
    ],
})

// Wrapper để xử lý error objects tự động
const logger = {
    error: (message: string, error?: Error | any) => {
        let logMessage = message

        if (error) {
            if (error instanceof Error) {
                // Nếu có Error object, thêm message và stack trace
                logMessage += ` ${error.message}`
                winstonLogger.error({
                    message: logMessage,
                    stack: error.stack,
                })
            } else if (typeof error === 'string') {
                // Nếu error là string, nối vào message
                logMessage += ` ${error}`
                winstonLogger.error(logMessage)
            } else {
                // Nếu là object khác, stringify và nối vào
                logMessage += ` ${JSON.stringify(error, null, 2)}`
                winstonLogger.error(logMessage)
            }
        } else {
            // Chỉ có message
            winstonLogger.error(logMessage)
        }
    },

    // Giữ lại các method khác nếu cần
    warn: (message: string) => winstonLogger.warn(message),
    info: (message: string) => winstonLogger.info(message),
    debug: (message: string) => winstonLogger.debug(message),
}

export default logger
