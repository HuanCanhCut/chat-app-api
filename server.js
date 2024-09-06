const express = require('express')
const route = require('./src/routes/index')
const app = express()
const cookieParser = require('cookie-parser')

require('dotenv').config()
require('express-async-errors')

const db = require('./src/config/db/index')
const cors = require('cors')
const errorHandler = require('./src/app/errors/errorHandler.js')

// connect to db
db.connect()

app.use(
    cors({
        origin: process.env.ORIGIN_URL,
        credentials: true,
    })
)

app.use(
    express.urlencoded({
        extended: true,
    })
)
app.use(express.json())
app.use(cookieParser())

route(app)

app.all('*', (req, res) => {
    return res.status(404).json({
        status: 404,
        message: `Can't find ${req.originalUrl} on this server!`,
    })
})

app.use(errorHandler)

app.listen(process.env.PORT, () => {
    console.log('Server started on port  ' + process.env.PORT)
})
