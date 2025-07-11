import { NextFunction, Response } from 'express'

import { UnprocessableEntityError } from '../errors/errors'
import ThemeService from '../services/ThemeService'
import { responseModel } from '../utils/responseModel'
import { IRequest } from '~/type'

class ThemeController {
    async getTheme(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { page, per_page } = req.query

            if (!page || !per_page) {
                return next(new UnprocessableEntityError({ message: 'Page and per_page are required' }))
            }

            const { themes, total } = await ThemeService.getTheme({ page: Number(page), per_page: Number(per_page) })

            res.json(
                responseModel({
                    data: themes,
                    total,
                    count: themes.length,
                    current_page: Number(page),
                    total_pages: Math.ceil(total / Number(per_page)),
                    per_page: Number(per_page),
                }),
            )
        } catch (error: any) {
            return next(error)
        }
    }
}

export default new ThemeController()
