import { NextFunction, Request, Response } from 'express'

import { NotFoundError, UnauthorizedError, UnprocessableEntityError } from '../errors/errors'
import { RefreshToken } from '../models'
import AuthService from '../services/AuthService'
import clearCookie from '../utils/clearCookies'
import {
    LoginRequest,
    LoginWithTokenRequest,
    RegisterRequest,
    ResetPasswordRequest,
    SendVerifyCodeRequest,
} from '../validator/api/authSchema'
import { User } from '~/app/models'

class AuthController {
    async sendToClient({
        res,
        user,
        token,
        refreshToken,
        status = 200,
        req,
    }: {
        res: Response
        user: User
        token: string
        refreshToken: string
        status?: number
        req: Request
    }) {
        await RefreshToken.create({
            user_id: user.id as number,
            refresh_token: refreshToken,
        })

        res.status(status)
            .setHeader('Set-Cookie', [
                `access_token=${token}; max-age=${60820005}; httpOnly; path=/; sameSite=Lax; secure; Partitioned; domain=${req?.headers.origin?.split('://')[1].split(':')[0]}`,
                `refresh_token=${refreshToken}; max-age=${Number(process.env.EXPIRED_REFRESH_TOKEN)}; httpOnly; path=/; sameSite=Lax; secure; Partitioned; domain=${req?.headers.origin?.split('://')[1].split(':')[0]}`,
            ])
            .json({
                data: user,
            })
    }

    // [POST] /auth/register
    async register(req: RegisterRequest, res: Response, next: NextFunction) {
        const { email, password } = req.body
        try {
            const { token, refreshToken, user } = await AuthService.register({ email, password })

            this.sendToClient({ res, user, token, refreshToken, status: 201, req })
        } catch (error: any) {
            return next(error)
        }
    }

    // [POST] /auth/login
    async login(req: LoginRequest, res: Response, next: NextFunction) {
        try {
            const { email, password } = req.body

            const { token, refreshToken, user } = await AuthService.login({ email, password })

            this.sendToClient({ res, user, token, refreshToken, req })
        } catch (error: any) {
            return next(error)
        }
    }

    // [POST] /auth/logout
    async logout(req: Request, res: Response, next: NextFunction) {
        try {
            const { access_token, refresh_token } = req.cookies

            await AuthService.logout({ access_token, refresh_token })

            clearCookie({ res, cookies: ['access_token', 'refresh_token'], req })

            res.sendStatus(204)
        } catch (error: any) {
            return next(error)
        }
    }

    // [POST] /auth/loginwithtoken
    async loginWithToken(req: LoginWithTokenRequest, res: Response, next: NextFunction) {
        try {
            const { token } = req.body

            const { token: accessToken, refreshToken, user } = await AuthService.loginWithToken({ token })

            this.sendToClient({ res, user, token: accessToken, refreshToken, req })
        } catch (error: any) {
            return next(error)
        }
    }

    // // [GET] /auth/refresh
    async refreshToken(req: Request, res: Response, next: NextFunction) {
        try {
            const { refresh_token } = req.cookies

            if (!refresh_token) {
                return next(new UnauthorizedError({ message: 'Authorization token is required' }))
            }

            const { newAccessToken, newRefreshToken } = await AuthService.refreshToken({ refresh_token })

            res.setHeader('Set-Cookie', [
                `access_token=${newAccessToken}; max-age=${60820005}; path=/; sameSite=Lax; secure; Partitioned; domain=${req?.headers.origin?.split('://')[1].split(':')[0]}`,
                `refresh_token=${newRefreshToken}; max-age=${Number(process.env.EXPIRED_REFRESH_TOKEN)}; path=/; sameSite=Lax; secure; Partitioned; domain=${req?.headers.origin?.split('://')[1].split(':')[0]}`,
            ])
                .status(200)
                .json({
                    // access token expire
                    exp: Math.floor(Date.now() / 1000) + Number(process.env.EXPIRED_TOKEN),
                })
        } catch (error: any) {
            if (error instanceof UnauthorizedError) {
                clearCookie({ res, cookies: ['access_token', 'refresh_token'], req })
            }

            return next(error)
        }
    }

    // [GET] /auth/verify
    async sendVerifyCode(req: SendVerifyCodeRequest, res: Response, next: NextFunction) {
        try {
            const { email } = req.body

            if (!/^\w+([\\.-]?\w+)*@\w+([\\.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
                return next(new UnprocessableEntityError({ message: 'Email is invalid' }))
            }

            await AuthService.sendVerifyCode({ email })

            res.sendStatus(204)
        } catch (error: any) {
            if (error?.parent?.errno === 1452) {
                return next(new NotFoundError({ message: 'Email not found' }))
            }

            return next(error)
        }
    }

    // // [POST] /auth/reset-password
    async resetPassword(req: ResetPasswordRequest, res: Response, next: NextFunction) {
        try {
            const { email, code, password } = req.body

            await AuthService.resetPassword({ email, code, password })

            res.sendStatus(204)
        } catch (error: any) {
            return next(error)
        }
    }
}

export default new AuthController()
