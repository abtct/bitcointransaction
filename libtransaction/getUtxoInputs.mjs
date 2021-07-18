
import sb from 'satoshi-bitcoin'

async function scanUtxoRpcLoop({rpc, descriptors}) {

    const getScanStatus = () => rpc('scantxoutset', ['status', descriptors])
    const getScanStart = () => rpc('scantxoutset', ['start', descriptors])

    try {
        console.debug({start: {descriptors}})
        return await getScanStart()
    } catch(error) {
        if(error.toString().indexOf('Scan already in progress, use action') === -1) {
            throw error
        }

        console.warn({scanAlreadyInProgressError: {descriptors}})

        let result = {}

        for(let hits = 0; hits < 20; hits++) {
            result = await getScanStatus()

            if(result == null) {
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

        return result
    }
}

async function getUtxoInputs({btclib, wallet}) {
    const rpc = btclib.createClient(wallet.rpcwallet)

    const descriptors = [`addr(${wallet.address})`]

    const result = await scanUtxoRpcLoop({rpc, descriptors})

    console.debug(JSON.stringify({descriptors, result}))

    if (!result.success) {
        console.error({result})
        throw new Error(`RPC scantxoutset did not succeed`)
    }

    const unspents = []

    if(!result.unspents) {
        return unspents
    }

    // todo: bottleneck

    for(const utxo of result.unspents) {
        const txHex = await rpc('getrawtransaction', [utxo.txid])

        console.warn({
            getRawTransaction: {
                txHex,
                amountInSatoshi: sb.toSatoshi(utxo.amount),
            }
        })

        unspents.push({
            txId: utxo.txid,
            vout: utxo.vout,
            value: sb.toSatoshi(utxo.amount),
            scriptPubKey: utxo.scriptPubKey,
            desc: utxo.desc,
            // redeemScript: i.redeemScript,
            // nonWitnessUtxo: Buffer.from(i.hash, 'hex'),
            witnessUtxo: {
                script: Buffer.from(utxo.scriptPubKey, 'hex'),
                value: sb.toSatoshi(utxo.amount),
            },

            nonWitnessUtxo: Buffer.from(txHex, 'hex')
        })
    }

    console.warn(`Address ${wallet.address}. Unspents: ${unspents.length}`)

    return unspents
}

export default getUtxoInputs