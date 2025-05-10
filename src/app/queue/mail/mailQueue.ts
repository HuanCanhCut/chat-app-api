import { Queue } from 'bullmq'
import { connection } from '../index'
import { QueueEnum } from '../../../enum/queue'

// Queue cho việc gửi email
const mailQueue = new Queue(QueueEnum.MAIL, {
    connection,
    defaultJobOptions: {
        attempts: 3, // Số lần thử lại nếu thất bại
        backoff: {
            type: 'exponential',
            delay: 5000, // Thời gian chờ để thử lại (ms)
        },
        removeOnComplete: true, // Xóa job khi hoàn thành
        removeOnFail: 5000, // Giữ job thất bại trong 5 giây để xem log
    },
})

interface MailData {
    email: string
    code: number
}

// Thêm job gửi mail vào queue
const addMailJob = async (data: MailData): Promise<void> => {
    await mailQueue.add(QueueEnum.SEND_VERIFICATION_CODE, data)
}

export { mailQueue, addMailJob, MailData }
