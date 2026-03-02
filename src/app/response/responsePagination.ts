import { Request } from 'express'

interface Links {
    prev?: string
    next?: string
}

interface responsePagination {
    req: Pick<Request, 'protocol' | 'get' | 'baseUrl'>
    data: any
    total: number
    count: number
    current_page: number
    per_page: number
}

export const responsePagination = ({ req, data, total, count, current_page, per_page }: responsePagination) => {
    const baseUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}`

    interface Response {
        data: any
        meta: {
            pagination: {
                total: number
                count: number
                total_pages: number
                current_page: number
                per_page: number
            }
            links: Links
        }
    }

    const totalPages = Math.ceil(total / per_page)

    const response: Response = {
        data,
        meta: {
            pagination: {
                total,
                count,
                total_pages: totalPages,
                current_page,
                per_page,
            },
            links: {},
        },
    }
    let prevPage = current_page - 1
    const nextPage = current_page + 1

    if (current_page > 1) {
        if (prevPage > totalPages) {
            prevPage = totalPages
        }

        response.meta.links.prev = `${baseUrl}?page=${prevPage}&per_page=${per_page}`
    }

    if (current_page < totalPages) {
        response.meta.links.next = `${baseUrl}?page=${nextPage}&per_page=${per_page}`
    }

    return response
}
