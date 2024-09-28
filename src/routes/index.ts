import authRoute from './auth'
import { Express } from 'express'
const route = (app: Express) => {
    app.use('/api/auth', authRoute)
}

export default route
