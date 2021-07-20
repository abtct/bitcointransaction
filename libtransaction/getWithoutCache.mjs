
async function getWithoutCache(cacheFileName, getPromiseCallback) {
    return await getPromiseCallback()
}

export default getWithoutCache