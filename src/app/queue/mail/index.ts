import { mailQueue, addMailJob, MailData } from './mailQueue'
import { mailWorker } from './mailWorker'

// Khởi chạy worker khi import module này
export { mailQueue, addMailJob, mailWorker, MailData }
