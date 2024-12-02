import { Express } from 'express'
import authRoute from './auth'
import userRoute from './user'
import meRoute from './me'
import notificationRoute from './notification'
import conversationRoute from './conversation'
import messageRoute from './message'

const route = (app: Express) => {
    app.use('/api/auth', authRoute)
    app.use('/api/users', userRoute)
    app.use('/api/me', meRoute)
    app.use('/api/notifications', notificationRoute)
    app.use('/api/conversations', conversationRoute)
    app.use('/api/messages', messageRoute)
}

export default route
