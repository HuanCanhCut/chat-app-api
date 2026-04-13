import cron from 'node-cron'

import PostService from '../services/PostService'

export const updateScores = async () => {
    console.log('[Score Job] Updating scores...')

    const count = await PostService.updatePostScore()

    console.log('[Score Job] Updated scores for', count, 'posts')
}

export const postScoreCron = () => {
    cron.schedule('*/5 * * * *', () => {
        updateScores().catch(console.error)
    })
}
