import { ConversationTheme } from '../models'
import { handleServiceError } from '../utils/handleServiceError'

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
        } catch (error) {
            return handleServiceError(error)
        }
    }
}

export default new ThemeService()
