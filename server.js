'use strict'

const express = require('express')
const process = require('process')

// константы
const port = 8080
const host = '0.0.0.0'

process.on('SIGINT', () => {
    console.info("Interrupted")
    process.exit(0)
})


// приложение
const app = express()
app.get('/', (req, res) => {
    res.send('Hello World')
})

app.listen(port, host)
console.log(`running on http://${host}:${port}`)