import { Job, Worker } from 'bullmq'

import { SystemMessageData } from './messageQueue'
import MessageService from '~/app/services/MessageService'
import { connection } from '~/config/redis'
import { QueueEnum } from '~/enum/queue'

// Khởi tạo worker để xử lý việc gửi system message
const systemMessageWorker = new Worker(
    QueueEnum.SYSTEM_MESSAGE,
    async (job: Job<SystemMessageData>) => {
        try {
            const { conversationUuid, message, type, currentUserId } = job.data

            console.log(`[System Message Worker] Processing job ${job.id}: ${message}`)

            await MessageService.createSystemMessage({
                conversationUuid,
                message,
                type,
                currentUserId,
            })

            console.log(`[System Message Worker] Job ${job.id} sent system message to ${conversationUuid}`)
        } catch (error: any) {
            console.error(`[System Message Worker] Error processing job ${job.id}: ${error.message}`)
            throw error // Đảm bảo job sẽ được thử lại nếu có lỗi
        }
    },
    { connection },
)

systemMessageWorker.on('completed', (job: Job<SystemMessageData> | undefined) => {
    if (job) {
        console.log(`[System Message Worker] Job ${job.id} has been completed`)
    }
})

systemMessageWorker.on('failed', (job: Job<SystemMessageData> | undefined, error: Error) => {
    if (job) {
        console.error(`[System Message Worker] Job ${job.id} has failed with error: ${error.message}`)
    } else {
        console.error(`[System Message Worker] Job has failed with error: ${error.message}`)
    }
})

export { systemMessageWorker }
