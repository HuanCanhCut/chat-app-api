// eslint-disable-next-line @typescript-eslint/no-require-imports
const dotenv = require('dotenv')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path')

// Load đúng file .env theo NODE_ENV
const envFile = `.env.${process.env.NODE_ENV || 'development'}`
dotenv.config({ path: path.resolve(process.cwd(), envFile) })

module.exports = {
    development: {
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        host: process.env.DB_HOST,
        dialect: 'mysql',
    },
    production: {
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        host: process.env.DB_HOST,
        dialect: 'mysql',
    },
}
