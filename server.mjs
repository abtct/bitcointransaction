'use strict'

// Ctrl+C fix
import process from 'process'

// config.json
import fs from 'fs'

/** @type {{rpcuser:string, rpcpassword:string, host:string, port:string}} */
const config = JSON.parse(fs.readFileSync('/storage/config.json', 'utf8'))

// wallets helper

import walletsHelper from "./libtransaction/walletsHelper.mjs"
const wallets = walletsHelper(config.host, config.port, config.rpcuser, config.rpcpassword)

process.on('SIGINT', () => {
    console.info("Interrupted")
    process.exit(0)
})


// Web server
import express from 'express'

const port = 8080
const host = '0.0.0.0'

const walletIds = ['wlC5ZGxA', 'wlDGPIoA', 'wlQfUszB', 'wl25X9bY']

const app = express()

function sendJSON(res, data) {
    res.header("Content-Type",'application/json');
    res.send(JSON.stringify(data, null, 4));
}

app.get('/balance', (req, res) => {

    wallets.getBalanceMany(walletIds)
        .then((result) => {

            const sum = Object.values(result).reduce((a, b) => a + b);

            sendJSON(res, {
                sum,
                wallets: result
            })
        })
        .catch((error) => {
            sendJSON(res, {error})
        })
})

app.get('/wallet-infos', (req, res) => {

    wallets.getWalletInfos()
        .then((result) => {
            sendJSON(res, {result})
        })
        .catch((error) => {
            sendJSON(res, {error})
        })
})

app.get('/accounts', async (req, res) => {

    const infos = await wallets.getWalletInfos()

    try {
        const result = await wallets.getAccounts(infos)
        sendJSON(res, {result})
    } catch (error) {
        sendJSON(res, {error})
    }

})

app.listen(port, host)
console.log(`running on http://${host}:${port}`)