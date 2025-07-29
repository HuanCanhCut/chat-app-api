// Helper function để thu thập thông tin runHooks từ include options
const collectRunHooksInfo = (includeOptions: any[], parentPath: string = ''): Map<string, boolean> => {
    const runHooksMap = new Map<string, boolean>()

    if (!includeOptions) return runHooksMap

    includeOptions.forEach((include: any) => {
        if (include.as) {
            const currentPath = parentPath ? `${parentPath}.${include.as}` : include.as

            // Lưu thông tin runHooks cho association này
            if (include.runHooks === true) {
                runHooksMap.set(currentPath, true)
            }

            // Đệ quy cho nested includes
            if (include.include) {
                const nestedMap = collectRunHooksInfo(include.include, currentPath)
                nestedMap.forEach((value, key) => {
                    runHooksMap.set(key, value)
                })
            }
        }
    })

    return runHooksMap
}

const handleChildrenAfterFindHook = async (
    instances: any,
    options: any,
    level = 0,
    runHooksMap?: Map<string, boolean>,
    currentPath: string = '',
): Promise<any> => {
    if (!instances) return Promise.resolve()

    // Giới hạn độ sâu để tránh vòng lặp vô hạn
    const MAX_LEVEL = 2
    if (level > MAX_LEVEL) return Promise.resolve()

    // Nếu đây là level 0 (root call), thu thập thông tin runHooks
    if (level === 0 && !runHooksMap && options?.include) {
        runHooksMap = collectRunHooksInfo(options.include)
    }

    if (Array.isArray(instances)) {
        return Promise.all(
            instances.map((instance: any) => {
                if (!instance || !instance.constructor) return Promise.resolve()
                const { options: instanceOptions } = instance.constructor
                return handleChildrenAfterFindHook(instance, instanceOptions, level, runHooksMap, currentPath)
            }),
        )
    }

    const instance = instances
    if (!instance || !instance.constructor) return Promise.resolve()
    const { constructor } = instance

    /**
     * Root model will have already run their "afterFind" hook.
     * Only run children "afterFind" hooks nếu runHooks được chỉ định.
     */
    if (level >= 1) {
        // Kiểm tra xem có nên chạy hook cho model này không
        const shouldRunHook = runHooksMap && runHooksMap.has(currentPath)

        if (shouldRunHook) {
            await constructor.runHooks('afterFind', instance, options)
        }
    }

    const { associations } = constructor
    const associatedNames = Object.keys(instance)
        .filter((attribute) => associations && Object.keys(associations).includes(attribute))
        .filter((name) => instance[name] !== null) // Bỏ qua các associations null

    if (associatedNames.length) {
        return Promise.all(
            associatedNames.map((name) => {
                const childInstances = instance[name]
                const childPath = currentPath ? `${currentPath}.${name}` : name
                return handleChildrenAfterFindHook(childInstances, options, level + 1, runHooksMap, childPath)
            }),
        )
    }

    return Promise.resolve()
}

export default handleChildrenAfterFindHook
