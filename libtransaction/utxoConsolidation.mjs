
import bitcoin from 'bitcoinjs-lib'
import sb from 'satoshi-bitcoin'
import coinSelect from 'coinselect'
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

function validatedOutputs({receivers, changeAddress}) {
    if(!Array.isArray(receivers)) {
        throw new Error('receivers is not an array')
    }
    if(!receivers.length) {
        throw new Error('receivers is empty')
    }

    if(!changeAddress) {
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
            receivers[i].address = changeAddress
        }

        receivers[i].value = sb.toSatoshi(receivers[i].value)
    }
    return receivers
}

async function utxoConsolidation({btclib, wallets, receivers, changeAddress, feeRate = 15, network = bitcoin.networks.testnet}) {

    // map { txId: KeyPair }
    const utxoKeyPairs = {}

    // array [ utxo ]
    const utxoDefs = []

    // Wallets -> UTXOs
    for(const wallet of validatedWallets(wallets)) {
        const keyPair = bitcoin.ECPair.fromWIF(wallet.wif, network)
        for(const utxo of await getUtxoInputs({btclib, wallet, network})) {
            utxoDefs.push(utxo)
            utxoKeyPairs[utxo.txId] = keyPair
        }
    }

    // Coin select
    const { inputs, outputs, fee } = coinSelect(
        validatedInputs(utxoDefs),
        validatedOutputs({receivers, changeAddress}),
        feeRate
    )

    if(inputs === undefined && outputs === undefined) {
        throw new Error('coinSelect failed (undefined)')
    }

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
            address: output.address ? output.address : changeAddress,
            value: output.value,
        })
    })

    inputs.forEach((input, i) => {
        psbt.signInput(i, utxoKeyPairs[input.txId])
    })

    psbt.validateSignaturesOfAllInputs()

    psbt.finalizeAllInputs()

    return psbt.extractTransaction()
}

export default utxoConsolidation