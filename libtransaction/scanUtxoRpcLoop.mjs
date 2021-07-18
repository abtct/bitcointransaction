export async function scanUtxoRpcLoop({rpc, descriptors}) {

    const getScanStatus = () => rpc('scantxoutset', ['status', descriptors])
    const getScanStart = () => rpc('scantxoutset', ['start', descriptors])

    try {
        console.debug({start: {descriptors}})
        return await getScanStart()
    } catch (error) {
        if (error.toString().indexOf('Scan already in progress, use action') === -1) {
            throw error
        }

        console.warn({scanAlreadyInProgressError: {descriptors}})

        let result = {}

        for (let hits = 0; hits < 20; hits++) {
            result = await getScanStatus()

            if (result == null) {
                console.warn('get scan status returned null for descriptors: ' + JSON.stringify(descriptors))
                return await getScanStatus()
            }

            if (result.progress !== undefined) {
                console.debug({descriptors, progress: result.progress})
            }

            if (result.progress >= 100 || result.success) {
                break
            }

            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        console.debug(JSON.stringify({descriptors, result}))

        if (!result.success) {
            console.error({result})
            throw new Error(`RPC scantxoutset: no success flag set in result (scanUtxoRpcLoop)`)
        }

        return result
    }
}