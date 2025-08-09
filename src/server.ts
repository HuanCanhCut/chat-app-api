import './config/env'
import setupGlobalErrorHandling from './app/errors/globalError'
setupGlobalErrorHandling()
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express, { Request, Response } from 'express'
import admin from 'firebase-admin'
import http from 'http'
import { PeerServer } from 'peer'
import { Server } from 'socket.io'

import 'express-async-errors'
import './app/queue'
import errorHandler from './app/errors/errorHandler'
import * as database from './config/database/index'
import serviceAccount from './config/firebase/serviceAccount'
import { redisClient } from './config/redis'
import socketIO from './config/socket'
import route from './routes/index'
const app = express()
const server = http.createServer(app)

PeerServer({
    port: Number(process.env.PEER_PORT),
    path: '/peerjs',
})

const allowedOrigins: string[] = ['https://huancanhcut.click', 'https://chatapp.local']

const corsOptions: cors.CorsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // allow requests from any origin
        if (!origin) return callback(null, true)

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true)
        } else {
            callback(new Error('CORS blocked!'))
        }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Refresh-Token-Required', 'x-refresh-token-required'],
    credentials: true,
    maxAge: 86400,
}

app.use(cors(corsOptions))

const io = new Server(server, {
    cors: {
        origin: function (origin, callback) {
            if (!origin) return callback(null, true)
            if (allowedOrigins.includes(origin)) {
                callback(null, true)
            } else {
                callback(new Error('CORS not allowed by server'))
            }
        },
        credentials: true,
    },
})

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
})

// connect to db
database.connect()

// connect to redis
;(async () => {
    await redisClient.connect()
})()

app.use(
    express.urlencoded({
        extended: true,
    }),
)

app.use(express.json())
app.use(cookieParser())

route(app)
socketIO(io)

app.all('*', (req: Request, res: Response) => {
    res.status(404).json({
        status: 404,
        message: `Can't find ${req.originalUrl} on this server!`,
    })
})

app.use(errorHandler)

server.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`)
})
