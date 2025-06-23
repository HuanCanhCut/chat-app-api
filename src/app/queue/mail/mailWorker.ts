import { Worker, Job } from 'bullmq'
import { connection } from '~/config/redis'
import sendVerificationCode from '../../helper/sendVerificationCode'
import { QueueEnum } from '~/enum/queue'

interface MailData {
    email: string
    code: number
}

// Khởi tạo worker để xử lý việc gửi mail
const mailWorker = new Worker(
    QueueEnum.MAIL,
    async (job: Job<MailData>) => {
        try {
            switch (job.name) {
                case QueueEnum.SEND_VERIFICATION_CODE: {
                    const { email, code } = job.data
                    console.log(`[Mail Worker] Processing job ${job.id}: sending verification code to ${email}`)

                    // Gọi hàm gửi email
                    await sendVerificationCode({ email, code })

                    console.log(`[Mail Worker] Job ${job.id} completed: email sent to ${email}`)
                    return { success: true }
                }
                default:
                    throw new Error(`Unknown job name: ${job.name}`)
            }
        } catch (error: any) {
            console.error(`[Mail Worker] Error processing job ${job.id}: ${error.message}`)
            throw error // Đảm bảo job sẽ được thử lại nếu có lỗi
        }
    },
    { connection },
)

mailWorker.on('completed', (job: Job<MailData> | undefined) => {
    if (job) {
        console.log(`[Mail Worker] Job ${job.id} has been completed`)
    }
})

mailWorker.on('failed', (job: Job<MailData> | undefined, error: Error) => {
    if (job) {
        console.error(`[Mail Worker] Job ${job.id} has failed with error: ${error.message}`)
    } else {
        console.error(`[Mail Worker] Job has failed with error: ${error.message}`)
    }
})

export { mailWorker }
