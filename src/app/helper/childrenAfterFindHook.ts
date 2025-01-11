const handleChildrenAfterFindHook = async (instances: any, options: any, level = 0): Promise<any> => {
    if (!instances) return Promise.resolve()

    if (Array.isArray(instances)) {
        return Promise.all(
            instances.map((instance: any) => {
                const { options: instanceOptions } = instance.constructor
                return handleChildrenAfterFindHook(instance, instanceOptions, level)
            }),
        )
    }

    const instance = instances
    const { constructor } = instance

    /**
     * Root model will have already run their "afterFind" hook.
     * Only run children "afterFind" hooks.
     */
    if (level >= 1) {
        await constructor.runHooks('afterFind', instance, options)
    }

    const { associations } = constructor
    const associatedNames = Object.keys(instance).filter((attribute) => Object.keys(associations).includes(attribute))

    if (associatedNames.length) {
        const childInstances = associatedNames.map((name) => instance[name])
        return handleChildrenAfterFindHook(childInstances, options, level + 1)
    }

    return Promise.resolve()
}

export default handleChildrenAfterFindHook
