import winston from 'winston'
import moment from 'moment-timezone'
import fs from 'fs'
import path from 'path'

const { combine, timestamp, printf } = winston.format

const logDir = 'log'
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
    transports: [new winston.transports.File({ filename: logFile, level: 'error' })],
})

export default logger
