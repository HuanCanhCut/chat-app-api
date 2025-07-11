import { InternalServerError } from '../errors/errors'
import { AppError } from '../errors/errors'
import { ConversationTheme } from '../models'

class ThemeService {
    async getTheme({ page, per_page }: { page: number; per_page: number }) {
        try {
            const { rows: themes, count } = await ConversationTheme.findAndCountAll({
                distinct: true,
                offset: (page - 1) * per_page,
                limit: per_page,
            })

            return {
                themes,
                total: count,
            }
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }
}

export default new ThemeService()
