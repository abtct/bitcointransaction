
import coinSelect from 'coinselect'

import bitcoin from 'bitcoinjs-lib'

import sb from 'satoshi-bitcoin'

function getUtxoInput(btclib, wallet)
{
    // TODO
    return {
        'txid': '6408410f01e2e11ad9dace33a68bad218fb9698ea2c5b36bf116a89416fa8b97',
        'vout': 1,
        'address': '2Mz48MFqqPwV5XfQoNCNpEqt8kVL7jW5kiq',
        'label': '',
        'redeemScript': '0014909651c8cc8dcaffa9aa8efa4104d4609a2062fe',
        'scriptPubKey': 'a9144aaf9924165e4890be15e6290893e0d73013012287',
        'amount': 0.49946610,
        'confirmations': 1,
        'spendable': true,
        'solvable': true,
        'desc': 'sh(wpkh([493c3ea9/0\'/0\'/7\']022c1bc64ef6ff9e4eaeeda41119998f1cf76db2a2d0f380af72b37f053da96863))#ve0rr094',
        'safe': true,
    }
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

        return {
            txId: t.txid,
            vout: t.vout,
            value: parseInt((t.amount * 10 ** 8).toFixed(8), 10),
            scriptPubKey: t.scriptPubKey,
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
        utxos
    })

    let { inputs, outputs, fee } = coinSelect(utxos, targets, 15)

    console.warn({
        outputs,
        inputs,
        fee
    })

    outputs = outputs.map(i => {
        if (!i.address) {
            i.address = changeDefaultAddress
        }

        return i
    })

    console.debug('createPsbt: 2')

    // TODO - which keypair?
    const a = bitcoin.payments.p2wpkh({ pubkey: inputKeyPairs[0].publicKey, network: btcNetwork })
    const b = bitcoin.payments.p2sh({ redeem: a, network: btcNetwork })
    const redeemScript = b.redeem.output.toString('hex')

    console.log({ utxosSum, inputs, outputs, fee, utxos, redeemScript })

    const psbt = new bitcoin.Psbt({ network: btcNetwork })
    inputs.forEach(input =>
        psbt.addInput({
            hash: input.txId,
            index: input.vout,
            redeemScript: Buffer.from(redeemScript, 'hex'),
            witnessUtxo: input.witnessUtxo,
        }),
    )

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

            hex: function() {
                return this._transaction.hex()
            },

            prepare: function() {

                if(this._inputs.length > 0) {
                    throw new Error('prepare: transaction inputs are ready')
                }

                if(this._wallets.length === 0) {
                    throw new Error('prepare: at least 1 wallet is required')
                }

                if(!this._btclib) {
                    throw new Error('prepare: btclib is required')
                }

                for(const w of this._wallets) {
                    try {
                        const utxo = getUtxoInput(this._btclib, w)
                        if(!utxo) {
                            continue
                        }
                        
                        this._inputs.push({
                            rpcwallet: w.rpcwallet,
                            address: w.address,
                            wif: w.wif,

                            transaction: utxo,
                        })
                    } catch(error) {
                        throw new Error(`prepare: getUtxoInput: ${w.rpcwallet} (${w.address}) failed: ${error}`)
                    }
                }

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
        }
    }
}