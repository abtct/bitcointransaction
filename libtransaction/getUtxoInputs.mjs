import sb from 'satoshi-bitcoin'
import getWithCache from "./getWithCache.mjs";
import {scanUtxoRpcLoop} from "./scanUtxoRpcLoop.mjs";

async function scanUtxoRpcLoopWrap({wallet, rpc, descriptors}) {
    try {
        return await getWithCache(
            `.cacheUTXOs.${wallet.address}.json`,
            () => scanUtxoRpcLoop({rpc, descriptors})
        )
    } catch(error) {
        throw new Error(`Get UTXO for rpcwallet ${wallet.rpcwallet} address ${wallet.address} error: ${error}`)
    }
}

async function getUtxoInputs({btclib, wallet}) {
    const rpc = btclib.createClient(wallet.rpcwallet)

    const descriptors = [`addr(${wallet.address})`]

    const result = await scanUtxoRpcLoopWrap({ wallet, rpc, descriptors })

    const unspents = []

    if(!result.unspents) {
        return unspents
    }

    // todo: bottleneck

    for(const utxo of result.unspents) {
        const txHex = await rpc('getrawtransaction', [utxo.txid])

        console.warn({nonWitnessUtxo: {txHex}})

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