

import { createBitcoinRpc } from '@carnesen/bitcoin-rpc';

/**
 *
 * @param host string
 * @param port string
 * @param rpcuser string
 * @param rpcpassword string
 * @returns {(method: string, params?: (any[] | {[p: string]: any} | undefined)) => Promise<any>}
 */
export default function(host, port, rpcuser, rpcpassword) {
    const rpcHref = `http://${rpcuser}:${rpcpassword}@${host}:${port}/`;
    return createBitcoinRpc(rpcHref);
}