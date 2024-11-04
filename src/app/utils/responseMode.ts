interface ResponseModel {
    data: any
    total: number
    count: number
    current_page: number
    total_pages: number
    per_page: number
}

export const responseModel = ({ data, total, count, current_page, total_pages, per_page }: ResponseModel) => {
    return {
        data,
        meta: {
            pagination: {
                total,
                count,
                total_pages,
                current_page,
                per_page,
            },
        },
    }
}
