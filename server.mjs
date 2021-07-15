'use strict'

// config.json
import { default as fs } from 'fs'

/** @type {{rpcuser:string, rpcpassword:string, host:string, port:string}} */
const config = JSON.parse(fs.readFileSync('/storage/config.json', 'utf8'))

// Create RPC client
import RPC from './libtransaction/rpc.mjs'

const rpc = RPC(config.host, config.port, config.rpcuser, config.rpcpassword)

// Ctrl+C fix
import { default as process } from 'process'

process.on('SIGINT', () => {
    console.info("Interrupted")
    process.exit(0)
})

// Web server
import express from 'express'

const port = 8080
const host = '0.0.0.0'

const app = express()
app.get('/', (req, res) => {
    rpc('getnetworkinfo')
        .then(result => {
            res.send({result})
        })
        .catch(error => {
            res.send({error})
        })
})

app.listen(port, host)
console.log(`running on http://${host}:${port}`)