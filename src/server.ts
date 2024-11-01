import express, { Request, Response } from 'express'
import admin from 'firebase-admin'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import 'express-async-errors'
import dotenv from 'dotenv'

import route from './routes/index'
import * as db from './config/db/index'
import { client as redisClient } from './config/redis'
import serviceAccount from './config/firebase/serviceAccount'
import errorHandler from './app/errors/errorHandler'

const app = express()

dotenv.config()

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
})

// connect to db
db.connect()

// connect to redis
redisClient.connect()

app.use(
    cors({
        origin: process.env.ORIGIN_URL,
        credentials: true,
    }),
)

app.use(
    express.urlencoded({
        extended: true,
    }),
)

app.use(express.json())
app.use(cookieParser())

route(app)

app.all('*', (req: Request, res: Response) => {
    res.status(404).json({
        status: 404,
        message: `Can't find ${req.originalUrl} on this server!`,
    })
})

app.use(errorHandler)

app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`)
})
