
import coinSelect from 'coinselect'

import { address as Address, Network, networks, payments, Psbt, Transaction, ECPair } from 'bitcoinjs-lib'
/*
const sigwitInputs = [
    {
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
    },
]

const utxos = sigwitInputs.map(i => {
    return {
        txId: i.txid,
        vout: i.vout,
        value: parseInt((i.amount * 10 ** 8).toFixed(8), 10),
        scriptPubKey: i.scriptPubKey,
        // redeemScript: i.redeemScript,
        // nonWitnessUtxo: Buffer.from(i.hash, 'hex'),
        witnessUtxo: {
            script: Buffer.from(i.scriptPubKey, 'hex'),
            value: parseInt((i.amount * 10 ** 8).toFixed(8), 10),
        },
    }
})

const utxosSum = utxos.reduce((sum, i) => sum + i.value, 0)

const targets = [
    {
        address: '2N7CHqnYhYb9i7dsih7JVGc9QFcnPXaNkde',
        value: 50000,
    },
]

let { inputs, outputs, fee } = coinSelect(utxos, targets, 15)

outputs = outputs.map(i => {
    if (!i.address) {
        i.address = '2Mz48MFqqPwV5XfQoNCNpEqt8kVL7jW5kiq'
    }

    return i
})

const keyPair = ECPair.fromWIF('cSmMkYKfyd9DaXN5p7DToyaGtkZWnrUejFfkF36eyNBwvUbpeDX4', networks.regtest)
const a = payments.p2wpkh({ pubkey: keyPair.publicKey, network: networks.regtest })
const b = payments.p2sh({ redeem: a, network: networks.regtest })
const redeemScript = b.redeem.output.toString('hex')

console.log({ utxosSum, inputs, outputs, fee, utxos, redeemScript })

const psbt = new Psbt({ network: networks.regtest })
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

// for (let i = 0; i < psbt.inputCount; i++) {
//     psbt.signInput(i, keyPair)
// }

psbt.signAllInputs(keyPair)
psbt.finalizeAllInputs()

console.log(psbt.extractTransaction().toHex())
*/

export default function(wallets, rpcHelper, receiver, amount) {
    throw new Error('Not Implemented')
}