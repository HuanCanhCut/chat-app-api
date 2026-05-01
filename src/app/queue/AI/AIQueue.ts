import { Queue } from 'bullmq'

import { connection } from '~/config/redis'
import { QueueEnum } from '~/enum/queue'

const aiQueue = new Queue(QueueEnum.AI, {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: 5000,
    },
})

interface AiData {
    conversation_uuid: string
    prompt: string
    botMessageId?: number
    parentMessageId: number
    currentUserId: number
}

const addAiJob = async (data: AiData): Promise<void> => {
    await aiQueue.add(QueueEnum.GENERATE_RESPONSE, data)
}

export { addAiJob, AiData, aiQueue }
