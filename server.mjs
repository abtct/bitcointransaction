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

app.get('/', (req, res) => {

    wallets.getTotalBalance(walletIds)
        .then((result) => {
            res.send({result})
        })
        .catch((error) => {
            res.send({error})
        })
})

app.listen(port, host)
console.log(`running on http://${host}:${port}`)