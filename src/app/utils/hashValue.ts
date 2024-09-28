import bcrypt from 'bcrypt'
const SALT_ROUND = Number(process.env.SALT_ROUND)

const hashValue = async (value: string) => {
    const salt = await bcrypt.genSalt(SALT_ROUND)
    return await bcrypt.hash(value, salt)
}

export default hashValue
