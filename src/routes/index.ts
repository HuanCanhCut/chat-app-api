import { Express } from 'express'

import authRoute from './auth'
import userRoute from './user'

const route = (app: Express) => {
    app.use('/api/auth', authRoute)
    app.use('/api/users', userRoute)
}

export default route
