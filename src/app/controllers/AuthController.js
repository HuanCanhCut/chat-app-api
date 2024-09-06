require('dotenv').config()
const { BadRequest, ConflictError, Internal, NotFoundError } = require('../errors/errors')
const { User, Password } = require('../models')
const { v4: uuidv4 } = require('uuid')
const { hashValue, createToken } = require('../project')
const bcrypt = require('bcrypt')
const { Sequelize } = require('sequelize')

class AuthController {
    // [POST] /auth/register
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

            const passwordHashed = await hashValue(password)

            await Password.create({
                user_id: user.id,
                password: passwordHashed,
            })

            const payload = {
                sub: user.id,
            }

            const token = createToken({ payload }).token

            return res
                .setHeader('Set-Cookie', `token=${token}; httpOnly; path=/; sameSite=None; secure; Partitioned`)
                .json({ data: user })
        } catch (error) {
            return next(new InternalServerError('error'))
        }
    }

    // [POST] /auth/login

    async login(req, res, next) {
        try {
            const { email, password } = req.body

            if (!email || !password) {
                return next(new BadRequest('Email and password are required'))
            }

            const user = await User.findOne({
                where: {
                    email,
                },
                include: {
                    model: Password,
                    where: {
                        user_id: Sequelize.col('User.id'),
                    },
                },
            })

            const passwordHashed = user.dataValues.Password.dataValues.password

            const isPasswordValid = bcrypt.compareSync(password, passwordHashed)

            if (!isPasswordValid) {
                return next(new BadRequest('Invalid email or password'))
            }

            const payload = {
                sub: user.id,
            }

            const token = createToken({ payload }).token

            delete user.dataValues.Password

            return res
                .setHeader('Set-Cookie', `token=${token}; httpOnly; path=/; sameSite=None; secure; Partitioned`)
                .json({ data: user })
        } catch (error) {
            return next(new Internal('Invalid email or password'))
        }
    }
}

module.exports = new AuthController()
