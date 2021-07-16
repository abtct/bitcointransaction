

import fetch from 'node-fetch'

function parseResponse(resp) {
    if (typeof resp.error !== undefined && resp.error) {
        throw {
            resp,
            rpc: {
                methodName: method,
                params,
                rpcHref
            },
        }
    }

    return resp.result
}

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

        try {
            const res = await fetch(rpcHref, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: {"Content-Type": "application/json"},
            })

            const resp = await res.json()

            return parseResponse(resp)

        } catch(e) {
            throw new Error(`RPC error (${method}): ${e}`)
        }
    }
}