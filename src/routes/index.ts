import { Express } from 'express'

import authRoute from './auth'
import userRoute from './user'
import meRoute from './me'
import notificationRoute from './notification'

const route = (app: Express) => {
    app.use('/api/auth', authRoute)
    app.use('/api/users', userRoute)
    app.use('/api/me', meRoute)
    app.use('/api/notifications', notificationRoute)
}

export default route
