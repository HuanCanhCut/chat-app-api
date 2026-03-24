import { AppError, InternalServerError } from '../errors/errors'
import Story from '../models/StoryModel'

class StoryService {
    createStory = async ({
        currentUserId,
        url,
        type,
    }: {
        currentUserId: number
        url: string
        type: 'image' | 'video'
    }) => {
        try {
            const story = await Story.create({
                user_id: currentUserId,
                url,
                type,
            })
            return story
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message + ' ' + error.stack })
        }
    }
}

export default new StoryService()
