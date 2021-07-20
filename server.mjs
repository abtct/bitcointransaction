'use strict'

// Ctrl+C fix
import process from 'process'

process.on('SIGINT', () => {
    console.info("Interrupted")
    process.exit(0)
})

// config.json
import {promises as fs, default as fsSync} from 'fs'

/** @type {{rpcuser:string, rpcpassword:string, host:string, port:string}} */
const config = JSON.parse(fsSync.readFileSync('/storage/config.json', 'utf8'))

// Bitcoin library

import btcLib from "./libtransaction/btcLib.mjs"

import utxoConsolidation from './libtransaction/utxoConsolidation.mjs'

const bitcoinNodeHost = process.env.BTC_NODE_HOST || config.host;

const btclib = btcLib(bitcoinNodeHost, config.port, config.rpcuser, config.rpcpassword)

// Web server
import express from 'express'
import bodyParser from 'body-parser'
import getWithDiskCache from "./libtransaction/getWithDiskCache.mjs";
import getWithoutCache from "./libtransaction/getWithoutCache.mjs";

const app = express();

const host = '0.0.0.0'
const port = process.env.PORT || 8080;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Add headers
app.use(function (req, res, next) {

    const allowedOrigin = process.env.SELF_URL || 'http://127.0.0.1:3086'
    console.warn({allowedOrigin})

    if(allowedOrigin) {
        // Website you wish to allow to connect
        res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    }

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

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

        const sum = Object.values(wallets).reduce((a, b) => a + b, 0)

        sendJSON(res, {sum, wallets})
    } catch(error) {
        console.error(error.stack)
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
            console.error(error.stack)
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

app.post('/api/generate/consolidation', async (req, res) => {

    console.log(req.body)

    try {
        const wallets = await btclib.getWallets()               // список кошельков
                                                                // читает из JSON-файла на диске и загружает на ноде
                                                                // если это требуется

        const walletsWIF = await btclib.getWalletsEx(wallets)   // список кошельков с добавленным полем wif (ключ)
                                                                // кошельки будут разблокированы (если есть пароль)
                                                                // и для каждого будет добавлен wif - ключ,
                                                                // нужный для подписи транзакций

        // Информация, необходимая для создания агреггирующей транзакции
        const params = {
            btclib,                                 // для работы с нодой
            walletsWIF,                             // кошельки-доноры
            receivers: [{                           // массив с описанием получаталей. Здесь можно указать несколько
                address:    req.body.receiver,      // (выход для сдачи/остатка указывать здесь не нужно)
                value:      req.body.amount
            }],
            changeAddress: req.body.changeAddress,  // адрес для получения сдачи от транзакции, если она будет
            feeRate: req.body.feeRate,              // ставка комиссии. Подробнее читать в описании функции coinSelect()
            getWithCache: getWithDiskCache,         // Используем кэш-файлы на диске
        }

        // вызываем генератор транзакции

        const { transaction } = await utxoConsolidation(params)

        // отправляем транзакцию закодированную в HEX-строку. В принципе, она уже готова для отправки в сеть.

        sendJSON(res, {
            transactionHex: transaction.toHex()
        })

    } catch(error) {
        console.error(error.stack)
        sendJSON(res, {
            request: req.body,
            error
        })
    }
})

async function deleteCacheFiles({addresses}) {
    const filenames = addresses.map(a => `/storage/.cacheUTXOs.${a}.json`)
    const p = filenames.map(filename => {
        try {
            fs.unlink(filename)
        } catch(_) {}
    })
    await Promise.all(p)
    return addresses
}

function auth({login, pass}) {
    if(login !== 'peoplebitcoins' || pass !== 'ssiuhiu^&yhweiu') {
        throw new Error('Authentication/authorization error {login, pass}')
    }
}

app.post('/api/send/transaction', async (req, res) => {

    try {
        console.warn(req.body)
        auth(req.body)
        console.warn(req.body)

        const resp = await btclib.sendRawTransaction(req.body.transactionHex)       // нам прислали HEX транзакции,
                                                                                    // отправляем ее в сеть

        sendJSON(res, {
            sendRawTransactionResponse: resp,
        })

    } catch(error) {
        console.error(error.stack)

        if(error.toString().indexOf('bad-txns-inputs-missingorspent') > -1) {
            error = 'bad-txns-inputs-missingorspent'
        }

        sendJSON(res, {
            request: req.body,
            error
        })
    }
})

app.delete('/api/cache/address-metadata', async (req, res) => {

    try {
        auth(req.body)

        let addresses = req.body.addresses
        if(addresses === undefined) {
            const wallets = await btclib.getWallets()
            addresses = wallets.map(w => w.adress)
        }

        await deleteCacheFiles({addresses})

        sendJSON(res, {
            countAddresses: addresses.length
        })

    } catch(error) {
        console.error(error.stack)
        sendJSON(res, {
            request: req.body,
            error
        })
    }

})

app.post('/api/generate/manager', async (req, res) => {

    try {
        auth(req.body)

        const walletsWIF = []

        if(req.body.wallets) {
            for (const w of req.body.wallets) {
                const wallet = await btclib.getWalletEx(w.rpcwallet, w.address, w.passphrase)
                walletsWIF.push(wallet)
            }
        } else {
            const wallets = await btclib.getWallets()
            walletsWIF.push(...await btclib.getWalletsEx(wallets))
        }

        const receivers = req.body.receivers.map((r, i) => {
            if(!r.address || !r.btc) {
                throw new Error(`receivers[${i}] must have 'address' and 'btc'.`)
            }
            return {
                address:    r.address,
                value:      r.btc,
            }
        })

        const getWithCache = req.body.useCache ? getWithDiskCache : getWithoutCache

        const params = {
            btclib,
            walletsWIF,
            receivers,
            changeAddress: req.body.changeAddress,
            feeRate: 15,
            getWithCache,
        }

        console.debug({utxoConsolidation: {params}})

        const { transaction, feeBTC, inputAddresses } = await utxoConsolidation(params)

        sendJSON(res, {
            transactionHex: transaction.toHex(),
            inputAddresses,
            fee: {
                btc: feeBTC
            }
        })

    } catch(error) {
        console.error(error.stack)
        sendJSON(res, {
            request: req.body,
            error
        })
    }
})

app.listen(port, host, () => console.log(`Listening on port ${port}`));