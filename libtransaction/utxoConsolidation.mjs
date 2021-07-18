
import bitcoin from 'bitcoinjs-lib'

import getUtxoInputs from "./getUtxoInputs.mjs";

import sb from 'satoshi-bitcoin'

import coinSelect from 'coinSelect'

import { promises as fs } from 'fs'

import path from 'path'

const ONE_HOUR = 60 * 60 * 1000; /* ms */

async function getUtxoInputsWrap({btclib, wallet}) {
    try {
        const cacheFileName = `.cacheUTXOs.${wallet.address}.json`

        try {
            const cache = JSON.parse(await fs.readFile(cacheFileName, 'utf8'))

            if(((new Date) - cache.timestamp) < ONE_HOUR) {
                console.debug(`Cache file used for UTXOs: ${cacheFileName}`)
                return cache.result
            } else {
                console.debug(`Cache file is outdated and not used for UTXOs: ${cacheFileName}`)
            }

        }
        catch(_) {
            console.debug(`Cache file handling filed: ${cacheFileName}`)
        }

        const result = await getUtxoInputs({btclib, wallet})

        const cache = {
            timestamp: (new Date).getTime(),
            result,
        }

        await fs.writeFile(cacheFileName, JSON.stringify(cache), 'utf8')

        console.debug(`Cache file written: ${cacheFileName}`)

        return result

    } catch(error) {
        console.error(error.stack)
        throw new Error(`Get UTXO for rpcwallet ${wallet.rpcwallet} address ${wallet.address} error: ${error}`)
    }
}

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

        receivers[i].value = sb.toSatoshi(receivers[i].value)
    }
    return receivers
}

async function utxoConsolidation({btclib, wallets, receivers, network = bitcoin.networks.testnet}) {

    const utxoKeyPairs = {}

    const spendableUTXOs = []

    for(const wallet of validatedWallets(wallets)) {
        const utxos = await getUtxoInputsWrap({btclib, wallet, network})

        const keyPair = bitcoin.ECPair.fromWIF(wallet.wif, network)

        for(const utxo of utxos) {
            spendableUTXOs.push(utxo)
            utxoKeyPairs[utxo.txId] = keyPair
        }
    }

    const given = {
        inputs:     validatedInputs(spendableUTXOs),
        outputs:    validatedOutputs(receivers),
    }

    console.info(JSON.stringify({
        consolidation: {
            wallets,
            receivers,
            prepare: {
                given,
            },
        },
    }))

    const { inputs, outputs, fee } = coinSelect(given.inputs, given.outputs, 15)

    console.info(JSON.stringify({
        consolidation: {
            coinSelect: {
                inputs,
                outputs,
                fee
            }
        }
    }))

    if(inputs === undefined && outputs === undefined) {
        throw new Error('coinSelect failed (undefined)')
    }

    const changeAddress = given.inputs[given.inputs.length - 1].address

    const psbt = new bitcoin.Psbt({ network })

    inputs.forEach(input => {
        psbt.addInput({
            hash:           input.txId,
            index:          input.vout,
            nonWitnessUtxo: input.nonWitnessUtxo,
        })
    })

    outputs.forEach(output => {
        const def = {
            address: output.address,
            value: output.value,
        }

        if(!def.address) {
            def.address = changeAddress
        }

        psbt.addOutput(def)
    })

    inputs.forEach((input, i) => {
        const keyPair = utxoKeyPairs[input.txId]
        if(!keyPair) {
            throw new Error(`utxoKeyPairs not found for txId ${input.txId} (Psbt input index ${i}) `)
        }
        psbt.signInput(i, keyPair)
    })

    psbt.validateSignaturesOfAllInputs()

    psbt.finalizeAllInputs()

    return psbt.extractTransaction()
}

export default utxoConsolidation