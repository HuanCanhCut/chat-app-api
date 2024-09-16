const bcrypt = require('bcrypt')
const SALT_ROUND = Number(process.env.SALT_ROUND)

const hashValue = async (value) => {
    const salt = await bcrypt.genSalt(SALT_ROUND)
    return await bcrypt.hash(value, salt)
}

module.exports = hashValue
