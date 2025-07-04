import { Queue } from 'bullmq'

import { connection } from '~/config/redis'
import { QueueEnum } from '~/enum/queue'

const systemMessageQueue = new Queue(QueueEnum.SYSTEM_MESSAGE, {
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

interface SystemMessageData {
    conversationUuid: string
    message: string
    type: string
    currentUserId: number
}

const addSystemMessageJob = async (data: SystemMessageData): Promise<void> => {
    await systemMessageQueue.add(QueueEnum.SYSTEM_MESSAGE, data)
}

export { addSystemMessageJob, SystemMessageData, systemMessageQueue }
