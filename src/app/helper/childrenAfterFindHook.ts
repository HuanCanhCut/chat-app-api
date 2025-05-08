//
const handleChildrenAfterFindHook = async (instances: any, options: any, level = 0): Promise<any> => {
    if (!instances) return Promise.resolve()

    // Giới hạn độ sâu để tránh vòng lặp vô hạn
    const MAX_LEVEL = 2
    if (level > MAX_LEVEL) return Promise.resolve()

    if (Array.isArray(instances)) {
        return Promise.all(
            instances.map((instance: any) => {
                if (!instance || !instance.constructor) return Promise.resolve()
                const { options: instanceOptions } = instance.constructor
                return handleChildrenAfterFindHook(instance, instanceOptions, level)
            }),
        )
    }

    const instance = instances
    if (!instance || !instance.constructor) return Promise.resolve()
    const { constructor } = instance

    /**
     * Root model will have already run their "afterFind" hook.
     * Only run children "afterFind" hooks.
     */
    if (level >= 1) {
        await constructor.runHooks('afterFind', instance, options)
    }

    const { associations } = constructor
    const associatedNames = Object.keys(instance)
        .filter((attribute) => associations && Object.keys(associations).includes(attribute))
        .filter((name) => instance[name] !== null) // Bỏ qua các associations null

    if (associatedNames.length) {
        const childInstances = associatedNames.map((name) => instance[name])
        return handleChildrenAfterFindHook(childInstances, options, level + 1)
    }

    return Promise.resolve()
}

export default handleChildrenAfterFindHook
