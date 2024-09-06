const winston = require('winston')
const { combine, timestamp, printf } = winston.format
const moment = require('moment-timezone') // Thêm thư viện moment-timezone

const customFormat = printf(({ level, message, timestamp }) => {
    const vietnamTime = moment(timestamp).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss.SSS')
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

module.exports = logger
