

import fetch from 'node-fetch'

export default function(host, port, rpcuser, rpcpassword, rpcwallet = null, scheme = 'http') {
    let rpcHref = `${scheme}://${rpcuser}:${rpcpassword}@${host}:${port}/`
    if (rpcwallet) {
        rpcHref += `wallet/${rpcwallet}`
    }

    return async function (method, params = []) {

        if(!Array.isArray(params)) {
            params = [params]
        }

        const payload = {
            jsonrpc: '1.0',
            id: '1',
            method,
            params,
        }

        const payloadJSON = JSON.stringify(payload)

        let res = null

        try {
            res = await fetch(rpcHref, {
                method: 'POST',
                body: payloadJSON,
                headers: {"Content-Type": "application/json"},
            })

        } catch(error) {
            throw new Error(`RPC fetch() error (${method}): ${error}`)
        }

        let resp = null

        try {
            resp = res.json !== undefined
                ? await res.json()
                : JSON.parse(res.text())
        } catch(error) {
            throw new Error(`RPC response parse error (${method}): ${error}`)
        }

        if (resp.error) {
            console.error(JSON.stringify({resp}))
            throw new Error(`RPC response has error (${method}): ${JSON.stringify(resp.error)}`)
        }

        return resp.result
    }
}