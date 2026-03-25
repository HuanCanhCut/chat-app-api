import Story from '../models/StoryModel'
import { handleServiceError } from '../utils/handleServiceError'
import { sequelize } from '~/config/database'

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
        } catch (error) {
            return handleServiceError(error)
        }
    }

    getStories = async ({
        page,
        per_page,
        currentUserId,
    }: {
        page: number
        per_page: number
        currentUserId: number
    }) => {
        try {
            const { rows: stories, count: total } = await Story.findAndCountAll({
                attributes: {
                    include: [
                        [
                            sequelize.literal(`(
                                CASE 
                                    WHEN EXISTS (
                                        SELECT 
                                            (1) 
                                        FROM 
                                            user_viewed_stories 
                                        WHERE 
                                            user_id = ${sequelize.escape(currentUserId)}
                                                AND
                                            story_id = Story.id
                                    ) THEN TRUE 
                                ELSE FALSE 
                                END
                            )`),
                            'is_viewed',
                        ],
                    ],
                },
                limit: per_page,
                offset: (page - 1) * per_page,
                order: [
                    ['is_viewed', 'ASC'],
                    ['id', 'DESC'],
                ],
            })

            return {
                stories,
                total,
            }
        } catch (error) {
            return handleServiceError(error)
        }
    }
}

export default new StoryService()
