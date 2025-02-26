import winston from 'winston'
import moment from 'moment-timezone'

const { combine, timestamp, printf } = winston.format

const customFormat = printf(({ level, message, timestamp }) => {
    const vietnamTime = moment(timestamp as string)
        .tz('Asia/Ho_Chi_Minh')
        .format('YYYY-MM-DD HH:mm:ss.SSS')
    return `
==============================================================================
${vietnamTime} 
[${level}]: ${message}
    `
})

const logger = winston.createLogger({
    level: 'error',
    format: combine(timestamp(), customFormat),
    transports: [new winston.transports.File({ filename: 'error.log', level: 'error' })],
})

export default logger
