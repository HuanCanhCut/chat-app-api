import { Express } from 'express'

import authRoute from './auth'
import cloudinaryRoute from './cloudinary'
import commentRoute from './comment'
import conversationRoute from './conversation'
import meRoute from './me'
import messageRoute from './message'
import notificationRoute from './notification'
import postRoute from './post'
import reactionRoute from './reaction'
import storyRoute from './story'
import themeRoute from './theme'
import userRoute from './user'
import verifyToken from '~/app/middlewares/verifyToken'

const route = (app: Express) => {
    app.use('/api/auth', authRoute)
    app.use('/api/users', verifyToken, userRoute)
    app.use('/api/me', verifyToken, meRoute)
    app.use('/api/notifications', verifyToken, notificationRoute)
    app.use('/api/conversations', verifyToken, conversationRoute)
    app.use('/api/messages', verifyToken, messageRoute)
    app.use('/api/themes', verifyToken, themeRoute)
    app.use('/api/posts', verifyToken, postRoute)
    app.use('/api/stories', verifyToken, storyRoute)
    app.use('/api/cloudinary', verifyToken, cloudinaryRoute)
    app.use('/api/reactions', verifyToken, reactionRoute)
    app.use('/api/comments', verifyToken, commentRoute)
}

export default route
