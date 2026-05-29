import cron from 'node-cron'

import PostService from '../services/PostService'

export const updateScores = async () => {
    try {
        console.log('[Score Job] Updating scores...')

        const count = await PostService.updatePostScore()

        console.log('[Score Job] Updated scores for', count, 'posts')
    } catch (error) {
        console.error('[Score Job] Failed to update scores:', error)
    }
}

export const postScoreCron = () => {
    cron.schedule('*/5 * * * *', async () => {
        await updateScores().catch(console.error)
    })
}
