import { createClient } from 'redis'

const client = createClient({
    url: process.env.REDIS_URL,
})
    .on('error', (err) => console.log('\x1b[31m%s\x1b[0m', 'Connect to Redis failure!!!', err))
    .on('connect', () => console.log('\x1b[36m%s\x1b[0m', '==>>>>>Connect to Redis successfully!!!'))

export default client
