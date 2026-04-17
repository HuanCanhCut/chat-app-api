import { Request } from 'express'

interface Links {
    prev?: string
    next?: string
}

interface ResponsePaginationBase {
    req: Pick<Request, 'protocol' | 'get' | 'originalUrl'>
    data: any
    total: number
    count: number
    current_page: number
    per_page: number
}

type ResponsePagination<T extends Record<string, unknown> = Record<string, unknown>> = ResponsePaginationBase & T

export const responsePagination = <T extends Record<string, unknown>>({
    req,
    data,
    total,
    count,
    current_page,
    per_page,
    ...rest
}: ResponsePagination<T>) => {
    const baseUrl = `${req.protocol}://${req.get('host')}${req.originalUrl.split('?')[0]}`

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
            ...rest,
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

interface ResponseCursorPaginationBase {
    req: Pick<Request, 'protocol' | 'get' | 'originalUrl'>
    data: any
    limit: number
    next_cursor?: string | null
}

type ResponseCursorPagination<T extends Record<string, unknown> = Record<string, unknown>> =
    ResponseCursorPaginationBase & T

export const responseCursorPagination = <T extends Record<string, unknown>>({
    req,
    data,
    limit,
    next_cursor,
    ...rest
}: ResponseCursorPagination<T>) => {
    const baseUrl = `${req.protocol}://${req.get('host')}${req.originalUrl.split('?')[0]}`

    return {
        data,
        meta: {
            pagination: {
                limit,
                has_next_page: !!next_cursor,
                next_cursor,
            },
            links: {
                next: next_cursor ? `${baseUrl}?cursor=${next_cursor}&limit=${limit}` : null,
            },
            ...rest,
        },
    }
}
