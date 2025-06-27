import { addMailJob, MailData, mailQueue } from './mailQueue'
import { mailWorker } from './mailWorker'

// Khởi chạy worker khi import module này
export { addMailJob, MailData, mailQueue, mailWorker }
