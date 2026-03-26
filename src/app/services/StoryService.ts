import { User } from '../models'
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
                distinct: true,
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
                include: {
                    model: User,
                    as: 'user',
                    attributes: ['avatar', 'full_name'],
                },
                limit: per_page,
                offset: (page - 1) * per_page,
                order: [
                    [
                        sequelize.literal(
                            `CASE 
                                WHEN 
                                    Story.user_id = ${sequelize.escape(currentUserId)} 
                                THEN 0 
                                ELSE 1 
                            END`,
                        ),
                        'ASC',
                    ],
                    ['is_viewed', 'ASC'],
                    ['id', 'DESC'],
                ],
                group: ['Story.user_id'],
            })

            return {
                stories,
                total: total.reduce((acc: number, curr: { count: number }) => {
                    return acc + curr.count
                }, 0),
            }
        } catch (error) {
            return handleServiceError(error)
        }
    }
}

export default new StoryService()
