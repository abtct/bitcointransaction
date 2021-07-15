

import { createBitcoinRpc } from '@carnesen/bitcoin-rpc'

/**
 *
 * @param host string
 * @param port string
 * @param rpcuser string
 * @param rpcpassword string
 * @param rpcwallet ?string
 * @returns {(method: string, params?: (any[] | {[p: string]: any} | undefined)) => Promise<any>}
 */
export default function(host, port, rpcuser, rpcpassword, rpcwallet = null) {
    let rpcHref = `http://${rpcuser}:${rpcpassword}@${host}:${port}/`
    if(rpcwallet) {
        rpcHref += `wallet/${rpcwallet}`
    }
    return createBitcoinRpc(rpcHref)
}