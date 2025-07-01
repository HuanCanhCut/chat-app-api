import { addSystemMessageJob, SystemMessageData, systemMessageQueue } from './messageQueue'
import { systemMessageWorker } from './messageWorker'

// Khởi chạy worker khi import module này
export { addSystemMessageJob, SystemMessageData, systemMessageQueue, systemMessageWorker }
