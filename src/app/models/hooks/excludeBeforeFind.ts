const excludeBeforeFind = (options: any, fieldsToExclude: string[] = []) => {
    // Hàm để xử lý loại bỏ trường từ attributes
    const excludeFields = (opts: any) => {
        if (!opts.attributes) {
            opts.attributes = { exclude: [] }
        }

        if (opts.attributes) {
            if (opts.attributes.exclude) {
                opts.attributes = { ...opts.attributes, exclude: [...opts.attributes.exclude] }
            } else {
                opts.attributes = { ...opts.attributes, exclude: [] }
            }
        }

        // Loại bỏ field khỏi kết quả
        opts.attributes.exclude.push(...fieldsToExclude)
    }

    // Loại bỏ fields khỏi model User
    excludeFields(options)

    // Nếu có include (liên kết với các bảng khác)
    if (options.include && Array.isArray(options.include)) {
        options.include.forEach((includeModel: any) => {
            excludeFields(includeModel)
        })
    }
}

export default excludeBeforeFind
