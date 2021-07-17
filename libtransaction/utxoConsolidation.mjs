
import bitcoin from 'bitcoinjs-lib'

import getUtxoInputs from "./getUtxoInputs.mjs";

function validatedWallets(wallets) {
    if(!Array.isArray(wallets)) {
        throw new Error('wallets is not an array')
    }
    if(!wallets.length) {
        throw new Error('wallets is empty')
    }
    for(let i = 0; i < wallets.length; i++) {
        if(typeof wallets[i].wif !== 'string') {
            throw new Error(`wallets index ${i} has no string 'wif' field`)
        }
    }
    return wallets
}

function validatedInputs(inputs) {
    if(!Array.isArray(inputs)) {
        throw new Error('inputs is not an array')
    }
    if(!inputs.length) {
        throw new Error('inputs is empty')
    }
    return inputs
}

function validatedOutputs(receivers) {
    if(!Array.isArray(receivers)) {
        throw new Error('receivers is not an array')
    }
    if(!receivers.length) {
        throw new Error('receivers is empty')
    }

    const defaultAddress = receivers[0].address
    if(!defaultAddress) {
        throw new Error('First receivers item must have an address (default change address)')
    }

    for(let i = 0; i < receivers.length; i++) {
        if(typeof receivers[i].address !== 'string') {
            throw new Error(`receivers index ${i} has no string 'address' field`)
        }
        if(typeof receivers[i].value !== 'number') {
            throw new Error(`receivers index ${i} has no number 'value' field`)
        }

        if(i > 0 && !receivers[i].address) {
            receivers[i].address = defaultAddress
        }
    }
    return receivers
}

async function utxoConsolidation({btclib, wallets, receivers, network = bitcoin.networks.testnet}) {
    const p = validatedWallets(wallets).map(w => getUtxoInputs(btclib, w, network))
    const origin = {
        inputs:     validatedInputs(await Promise.all(p)),
        outputs:    validatedOutputs(receivers),
    }

    const { inputs, outputs, fee } = coinSelect(origin.inputs, origin.outputs, 15)

    if(inputs === undefined && outputs === undefined) {
        throw new Error('coinSelect failed (undefined)')
    }

    const changeAddress = this._inputs[this._inputs.length - 1].address

    const psbt = new bitcoin.Psbt({ network })

    inputs.forEach(input => {
        psbt.addInput({
            hash:           input.txId,
            index:          input.vout,
            nonWitnessUtxo: input.nonWitnessUtxo,
        })
    })

    outputs.forEach(output => {
        psbt.addOutput({
            address: output.address,
            value: output.value,
        })
    })

    inputs.forEach((input, i) => {
        psbt.signInput(i, input.keyPair)
    })

    psbt.validateSignaturesOfAllInputs()

    psbt.finalizeAllInputs()

    return psbt.extractTransaction()
}

export default utxoConsolidation