
import bitcoin from 'bitcoinjs-lib'

async function getUtxoInputs(btclib, wallet, network) {
    const rpc = btclib.createClient(wallet.rpcwallet)

    try {
        const descriptors = [`addr(${wallet.address})`]
        const result = await rpc('scantxoutset', ['start', descriptors])

        if (!result.success) {
            console.error({result})
            throw new Error(`RPC scantxoutset did not succeed`)
        }
    } catch(error) {
        throw new Error(`Get UTXO for rpcwallet ${wallet.rpcwallet} address ${wallet.address} error: ${error}`)
    }

    const keyPair = bitcoin.ECPair.fromWIF(wallet.wif, network)

    if(!result.unspents) {
        return []
    }

    return result.unspents.map(utxo => {
        const txHex = rpc('getrawtransaction', [utxo.txid])

        return {
            keyPair,

            txId: utxo.txid,
            vout: utxo.vout,
            value: parseInt((utxo.amount * 10 ** 8).toFixed(8), 10),
            scriptPubKey: utxo.scriptPubKey,
            desc: utxo.desc,
            // redeemScript: i.redeemScript,
            // nonWitnessUtxo: Buffer.from(i.hash, 'hex'),
            witnessUtxo: {
                script: Buffer.from(utxo.scriptPubKey, 'hex'),
                value: parseInt((utxo.amount * 10 ** 8).toFixed(8), 10),
            },

            nonWitnessUtxo: Buffer.from(txHex, 'hex')
        }
    })
}

export default getUtxoInputs