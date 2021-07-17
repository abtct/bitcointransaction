
import coinSelect1 from 'coinselect/blackjack.js'
import coinSelect2 from 'coinselect/accumulative.js'

import bitcoin from 'bitcoinjs-lib'

import sb from 'satoshi-bitcoin'

async function getUTXOs(btclib, wallet)
{
    const scan = btclib.scanTxOutSet(wallet.rpcwallet, wallet.address)
    const result = await scan.start()

    const out = {
        unspents:       [],
        totalAmount:    0,
    }
    
    const err = `scanTxOutSet.start for address ${wallet.address} (${wallet.rpcwallet})`

    if(!result.success) {
        console.error(`${err} - rpc did not return success`)
        return out
    }
    
    if(typeof result.unspents !== typeof []) {
        console.error(`${err} - rpc did not return array of unspents`)
        return out
    }
    
    out.unspents = result.unspents

    if(result.total_amount) {
        out.totalAmount = parseFloat(result.total_amount)
    }

    return out
}

function createPsbt(btcNetwork, metaInputs, targets, changeDefaultAddress) {
    const inputKeyPairs = []

    if(!metaInputs) {
        throw new Error('metaInputs required')
    }

    const utxos = metaInputs.map(input => {
        const t = input.transaction

        const keyPair = bitcoin.ECPair.fromWIF(input.wif, btcNetwork)
        inputKeyPairs.push(keyPair)

        console.warn({tra: input})

        return {
            txId: t.txid,
            vout: t.vout,
            value: parseInt((t.amount * 10 ** 8).toFixed(8), 10),
            scriptPubKey: t.scriptPubKey,
            desc: t.desc,
            // redeemScript: i.redeemScript,
            // nonWitnessUtxo: Buffer.from(i.hash, 'hex'),
            witnessUtxo: {
                script: Buffer.from(t.scriptPubKey, 'hex'),
                value: parseInt((t.amount * 10 ** 8).toFixed(8), 10),
            },
        }
    })

    const utxosSum = utxos.reduce((sum, i) => sum + i.value, 0)

    console.debug('createPsbt: 1')

    console.warn({
        targets,
        utxos,
    })

    let outputs = null,
        inputs = null,
        fee = null

    for(const coinSelect of [coinSelect1, coinSelect2]) {
        let coinSelectResult = coinSelect(utxos, targets, 15)

        console.warn({
            coinSelect,
            coinSelectResult,
        })

        if(coinSelectResult.outputs !== undefined && coinSelectResult.inputs !== undefined) {
            outputs = coinSelectResult.outputs
            inputs = coinSelectResult.inputs
            fee = coinSelectResult.fee
            break
        }
    }

    if(!outputs && !inputs) {
        throw new Error('coinSelect algorithms failed')
    }

    outputs = outputs.map(i => {
        if (!i.address) {
            i.address = changeDefaultAddress
        }

        return i
    })

    console.debug('createPsbt: 2')

    const psbt = new bitcoin.Psbt({ network: btcNetwork })

    inputs.forEach((input, i) => {
        const a = bitcoin.payments.p2wpkh({pubkey: inputKeyPairs[i].publicKey, network: btcNetwork})
        const b = bitcoin.payments.p2sh({redeem: a, network: btcNetwork})
        const redeemScript = b.redeem.output.toString('hex')

        psbt.addInput({
            hash: input.txId,
            index: input.vout,
            redeemScript: Buffer.from(redeemScript, 'hex'),
            witnessUtxo: input.witnessUtxo,
        })
    })

    console.log({ utxosSum, inputs, outputs, fee, utxos })

    outputs.forEach(output => {
        psbt.addOutput({
            address: output.address,
            value: output.value,
        })
    })

    for (let i = 0; i < psbt.inputCount; i++) {
        psbt.signInput(i, inputKeyPairs[i])
    }

    psbt.finalizeAllInputs()

    return psbt.extractTransaction()
}

export default {
    new: function() {
        return {

            // config
            _network: bitcoin.networks.testnet,
            _btclib: null,
            _wallets: [],
            _targets: [],

            // prepare
            _inputs: [],

            // result
            _transaction: null,

            network: function(btcNetwork) {
                this._network = btcNetwork

                return this
            },

            btcLib: function(btclib) {
                this._btclib = btclib

                return this
            },

            setWallets: function(wallets) {
                this._wallets = []

                for(const i in wallets) {
                    try {
                        this.addWallet(wallets[i])
                    } catch(error) {
                        throw new Error(`setWallets: index ${i}: ${error}`)
                    }
                }

                return this
            },

            addWallet: function(w) {

                const validation = ['rpcwallet', 'address', 'wif']
                for(const key of validation) {
                    if(typeof w[key] !== 'string') {
                        throw new Error(`addWallet: key '${key}' (string) is required)`)
                    }

                    if(!w[key]) {
                        throw new Error(`addWallet: key '${key}' (string) cannot be empty`)
                    }
                }

                this._wallets.push({
                    rpcwallet: w.rpcwallet,
                    address: w.address,
                    passphrase: w.passphrase,
                    wif: w.wif,
                })

                return this
            },

            setTarget: function(address, value, convertToSatoshi = true) {
                this._targets = []

                return this.addTarget(address, value, convertToSatoshi)
            },

            addTarget: function(address, value, convertToSatoshi = true) {

                if(typeof address !== 'string' || !address) {
                    throw new Error(`addTarget: 'address' must be of type 'string' and may not be empty.`)
                }

                if(typeof value !== 'number' || !value) {
                    throw new Error(`addTarget: 'address' must be of type 'number' and may not be empty.`)
                }

                if(convertToSatoshi) {
                    value = sb.toSatoshi(value)
                }

                this._targets.push({
                    address,
                    value
                })

                return this
            },

            prepare: async function() {

                if(this._inputs.length > 0) {
                    throw new Error('prepare: transaction inputs are ready')
                }

                if(this._wallets.length === 0) {
                    throw new Error('prepare: at least 1 wallet is required')
                }

                if(!this._btclib) {
                    throw new Error('prepare: btclib is required')
                }

                let btcTotalUnspent = 0

                for(const w of this._wallets) {
                    try {

                        const { unspents, totalAmount } = await getUTXOs(this._btclib, w)
                        if(!unspents) {
                            continue
                        }

                        console.warn({unspents, totalAmount})

                        btcTotalUnspent += totalAmount

                        unspents.forEach(utxo => this._inputs.push({
                            rpcwallet: w.rpcwallet,
                            address: w.address,
                            wif: w.wif,

                            transaction: utxo,
                        }))

                    } catch(error) {
                        throw new Error(`prepare: getUTXOs: ${w.rpcwallet} (${w.address}) failed: ${error}`)
                    }
                }

                let totalUnspent = sb.toSatoshi(btcTotalUnspent)

                let totalRequest = 0
                for(const target of this._targets) {
                    totalRequest += target.value
                }

                // if(totalRequest >= totalUnspent) {
                //     throw new Error(`Total request vs. total unspent ${totalRequest} vs ${totalUnspent} (satoshi): unspent`)
                // }

                return this
            },

            createTransaction: function() {

                if(this._transaction) {
                    throw new Error('createTransaction: transaction is created')
                }

                if(this._inputs.length < 1) {
                    throw new Error("createTransaction: at least 1 input has to be prepared")
                }

                if(this._targets.length < 1) {
                    throw new Error("createTransaction: at least 1 target is required")
                }

                const targetAddresses = this._targets.map((t) => t.address)
                const inputAddresses = this._inputs.map((i) => i.address)
                const addressConflicts = targetAddresses.filter(a => inputAddresses.includes(a))
                if(addressConflicts.length > 0) {
                    throw new Error(`createTransaction: detected ${addressConflicts.length} intersections ` + `
            of input and output addresses in the request (wallets and targets), addresses: ${addressConflicts}`)
                }

                // change goes to the last input
                const changeAddress = this._inputs[this._inputs.length - 1].address

                console.warn({
                    targets: this._targets
                })

                try {
                    this._transaction = createPsbt(
                        this._network,
                        this._inputs,
                        this._targets,
                        changeAddress
                    )
                } catch(error) {
                    throw new Error(`createPsbt(): ${error}`)
                }

                return this
            },

            result: function() {
                if(!this._transaction) {
                    throw new Error('cannot get created transaction')
                }

                return this._transaction
            },

            hex: function() {
                return this.result().toHex()
            }
        }
    }
}