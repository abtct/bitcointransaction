import {promises as fs} from "fs";

const ONE_HOUR = 60 * 60 * 1000; /* ms */

async function getWithCache(cacheFileName, getPromiseCallback) {

    try {
        const cache = JSON.parse(await fs.readFile(cacheFileName, 'utf8'))

        if(((new Date) - cache.timestamp) < ONE_HOUR) {
            console.debug(`Cache file used: ${cacheFileName}`)
            return cache.result
        } else {
            console.debug(`Cache file is outdated and not used: ${cacheFileName}`)
        }

    }
    catch(_) {
        console.debug(`Cache file handling filed: ${cacheFileName}`)
    }

    const result = await getPromiseCallback()

    const cache = {
        timestamp: (new Date).getTime(),
        result,
    }

    await fs.writeFile(cacheFileName, JSON.stringify(cache), 'utf8')

    console.debug(`Cache file written: ${cacheFileName}`)

    return result
}

export default getWithCache