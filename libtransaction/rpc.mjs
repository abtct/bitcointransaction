

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

        const res = await fetch(rpcHref, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: {"Content-Type": "application/json"},
        })

        const result = await res.json()

        if (typeof result.error !== undefined && result.error) {
            throw {
                result,
                rpc: {
                    methodName: method,
                    params,
                    rpcHref
                },
            }
        }

        return result.result
    }
}