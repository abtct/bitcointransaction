'use strict'

// Ctrl+C fix
import process from 'process'

process.on('SIGINT', () => {
    console.info("Interrupted")
    process.exit(0)
})

// config.json
import fs from 'fs'

/** @type {{rpcuser:string, rpcpassword:string, host:string, port:string}} */
const config = JSON.parse(fs.readFileSync('/storage/config.json', 'utf8'))

// Bitcoin library

import btcLib from "./libtransaction/btcLib.mjs"

const btclib = btcLib(config.host, config.port, config.rpcuser, config.rpcpassword)

// Web server
import express from 'express'
import bodyParser from 'body-parser'

const app = express();

const host = '0.0.0.0'
const port = process.env.PORT || 8080;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

function sendJSON(res, data) {
    res.header("Content-Type",'application/json')

    switch(typeof data.error) {
        case 'object':
            data.error = data.error.toString();
    }

    res.send(JSON.stringify(data, null, 4))
}

const testStaticWalletIds = ['wlC5ZGxA', 'wlDGPIoA', 'wlQfUszB', 'wl25X9bY']

/**
 * Выводим балансы по кошелькам из testStaticWalletIds
 * и суммарный баланс на этих кошельках одной цифрой (примерно столько мы можем максимально отправить)
 */
app.get('/api/balance', async (req, res) => {

    try {

        const wallets = await btclib.getBalanceMany(testStaticWalletIds)

        const sum = Object.values(wallets).reduce((a, b) => a + b)

        sendJSON(res, {sum, wallets})
    } catch(error) {
        sendJSON(res, {error})
    }
})

/**
 * Ищем кошельки в DAT.JSON-файле,
 * загружаем их на ноде (если требуется)
 * и выводим список WalletInfo для существующих и загруженных кошельков.
 *
 * (мы используем wallets...dat.json в ui.php для сохранения доступов к соз-даваемым кошелькам)
 */
app.get('/api/wallets', (req, res) => {

    btclib.getWallets()
        .then((result) => {
            sendJSON(res, {result})
        })
        .catch((error) => {
            sendJSON(res, {error})
        })
})

/**
 * Для загруженных кошельков отобразить доп. данные
 */
app.get('/api/wallets/ex', async (req, res) => {

    try {
        const wallets = await btclib.getWallets()
        const result = await btclib.getWalletsEx(wallets)
        sendJSON(res, {result})
    } catch (error) {
        sendJSON(res, {error})
    }

})

app.listen(port, host, () => console.log(`Listening on port ${port}`));