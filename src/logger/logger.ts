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

const customFormat = printf(({ level, message, timestamp }) => {
    const vietnamTime = moment(timestamp as string)
        .tz('Asia/Ho_Chi_Minh')
        .format('YYYY-MM-DD HH:mm:ss.SSS')
    return ` ==============================================================================
${vietnamTime} 
[${level}]: ${message}
    `
})

const logger = winston.createLogger({
    level: 'error',
    format: combine(timestamp(), customFormat),
    transports: [
        new winston.transports.File({ filename: logFile, level: 'error' }),
        new winston.transports.Console({
            format: combine(colorize({ all: true, colors: { error: 'red' } }), timestamp(), customFormat),
        }),
    ],
})

export default logger
