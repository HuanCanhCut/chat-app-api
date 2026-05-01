import { Job, Worker } from 'bullmq'
import { v4 as uuidV4 } from 'uuid'

import { AiData } from './AIQueue'
import { GoogleGenAI } from '@google/genai'
import { Message, User } from '~/app/models'
import ConversationService from '~/app/services/ConversationService'
import MessageService from '~/app/services/MessageService'
import { connection } from '~/config/redis'
import { ioInstance } from '~/config/socket'
import { QueueEnum } from '~/enum/queue'

const aiWorker = new Worker(
    QueueEnum.AI,
    async (job: Job<AiData>) => {
        try {
            switch (job.name) {
                case QueueEnum.GENERATE_RESPONSE: {
                    console.log(
                        '\x1b[33m [AI Worker] Generating response for conversation ' +
                            job.data.conversation_uuid +
                            ' \x1b[0m',
                    )

                    const { conversation_uuid, prompt, parentMessageId } = job.data

                    const botId = Number(process.env.BOT_USER_ID)
                    const apiKey = process.env.BOT_API_KEY

                    if (!botId) {
                        throw new Error('BOT_USER_ID is not configured in environment variables')
                    }

                    if (!apiKey) {
                        throw new Error('BOT_API_KEY is not configured in environment variables')
                    }

                    /**
                     * Ensure bot is exists
                     */
                    let botUser = await User.findByPk(botId)

                    /**
                     * If bot not found, create it
                     */
                    if (!botUser) {
                        botUser = await User.create({
                            id: botId,
                            first_name: 'Penguin',
                            last_name: 'AI',
                            full_name: 'Penguin AI',
                            nickname: 'penguin_ai',
                            uuid: uuidV4(),
                            email: 'penguinai@huanpenguin.com',
                            password: '', // No password for bot
                            avatar: 'https://res.cloudinary.com/dkmwrkngj/image/upload/v1759854156/dark-logo_e176mo.png',
                        })
                    }

                    const conversation = await ConversationService.getConversationByUuid({
                        currentUserId: 1,
                        uuid: conversation_uuid,
                    })

                    if (!conversation) {
                        throw new Error(`Conversation with UUID ${conversation_uuid} not found`)
                    }

                    /**
                     * After a job fails, it will retry.
                     * So we need to check if the bot message already exists.
                     */

                    let botMessage

                    if (job.data.botMessageId) {
                        botMessage = await Message.findByPk(job.data.botMessageId)
                    }

                    if (!botMessage) {
                        /**
                         * Initial empty message
                         */
                        botMessage = await Message.create({
                            conversation_id: conversation.id,
                            sender_id: botId,
                            content: '',
                            type: 'text',
                            parent_id: parentMessageId,
                        })

                        /**
                         * Save botMessageId to job data so retries won't create a new message
                         */
                        if (botMessage) {
                            job.updateData({ ...job.data, botMessageId: botMessage.id })
                        }
                    }

                    /**
                     * Emit new message to conversation
                     */

                    const lastMessage = await MessageService.getLastMessage({
                        conversationUuid: conversation_uuid,
                        currentUserId: botId,
                    })

                    ioInstance.to(conversation_uuid).emit('NEW_MESSAGE', {
                        conversation: {
                            ...conversation.dataValues,
                            last_message: lastMessage,
                        },
                    })

                    const ai = new GoogleGenAI({ apiKey })

                    const stream = await ai.models.generateContentStream({
                        model: 'gemma-3-27b-it',
                        contents: prompt,
                    })

                    let finalText = ''
                    let buffer = ''
                    let timer: NodeJS.Timeout | null = null

                    const FLUSH_INTERVAL = 50 // ms
                    const MAX_BUFFER = 50 // chars

                    const flush = () => {
                        if (!buffer) return

                        ioInstance.to(conversation_uuid).emit('UPDATE_MESSAGE', {
                            message_id: botMessage.id,
                            chunk: buffer,
                        })

                        buffer = ''

                        if (timer) {
                            clearTimeout(timer)
                            timer = null
                        }
                    }

                    for await (const chunk of stream) {
                        const text = chunk.text
                        if (!text) continue

                        finalText += text
                        buffer += text

                        /**
                         *  if buffer is large enough, send immediately
                         */
                        if (buffer.length >= MAX_BUFFER) {
                            flush()
                            continue
                        }

                        /**
                         * if there is no timer, set timer
                         */
                        if (!timer) {
                            timer = setTimeout(flush, FLUSH_INTERVAL)
                        }
                    }

                    /**
                     * Flush remaining content
                     */
                    flush()

                    console.log(finalText)

                    /**
                     * Update final message content in database
                     */
                    botMessage.content = finalText

                    await botMessage.save()

                    break
                }
                default:
                    throw new Error(`Unknown job name: ${job.name}`)
            }
        } catch (error: any) {
            console.error(`\x1b[31m [Mail Worker] Error processing job ${job.id}: ${error.message} \x1b[0m`)
            throw error // Đảm bảo job sẽ được thử lại nếu có lỗi
        }
    },
    { connection },
)

aiWorker.on('completed', (job: Job<AiData> | undefined) => {
    if (job) {
        console.log(`\x1b[33m [Mail Worker] Job ${job.id} has been completed \x1b[0m`)
    }
})

aiWorker.on('failed', async (job: Job<AiData> | undefined, error: Error) => {
    if (job) {
        console.error(`[Mail Worker] Job ${job.id} has failed with error: ${error.message}`)

        /**
         * If job failed until max attempts, update the content to error message
         */
        const maxAttempts = job.opts.attempts ?? 3

        if (job.attemptsMade >= maxAttempts) {
            if (job.attemptsMade >= maxAttempts) {
                console.log(
                    `\x1b[31m [AI Worker] Job ${job.id} exhausted all attempts, update content bot message \x1b[0m`,
                )

                if (job.data.botMessageId) {
                    await Message.update(
                        {
                            content: 'Error when generate response',
                        },
                        { where: { id: job.data.botMessageId } },
                    )
                }
            }
        }
    } else {
        console.error(`[Mail Worker] Job has failed with error: ${error.message}`)
    }
})

export { aiWorker }
