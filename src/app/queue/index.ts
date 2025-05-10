import { Queue, Worker, QueueEvents } from 'bullmq'
import { Redis } from 'ioredis'

// Cấu hình kết nối Redis
const redisConfig: Record<string, any> = {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    maxRetriesPerRequest: null,
}

// Thêm password chỉ khi có giá trị
if (process.env.REDIS_PASSWORD) {
    redisConfig.password = process.env.REDIS_PASSWORD
}

const connection = new Redis(redisConfig)

export { Queue, Worker, QueueEvents, connection }
