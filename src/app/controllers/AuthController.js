require('dotenv').config()
const { InternalServerError, BadRequest, ConflictError } = require('../errors/errors')
const { User, Password } = require('../models')
const { v4: uuidv4 } = require('uuid')

class AuthController {
    async register(req, res, next) {
        try {
            const { email, password } = req.body

            if (!email || !password) {
                return next(new BadRequest('Email and password are required'))
            }

            const [user, created] = await User.findOrCreate({
                where: {
                    email,
                },
                defaults: {
                    email,
                    uuid: uuidv4(),
                },
            })

            if (!created) {
                return next(new ConflictError('User already exists'))
            }

            await Password.create({
                user_id: user.id,
                password,
            })

            return res.json({ data: user })
        } catch (error) {
            return next(new InternalServerError('error'))
        }
    }
}

module.exports = new AuthController()
