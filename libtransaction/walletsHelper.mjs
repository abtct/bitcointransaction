import RPC from './rpc.mjs'
import fs from 'fs'
import glob from 'glob-promise'
import rpc from "./rpc.mjs";

export default function(host, port, rpcuser, rpcpassword) {
    return {
        host,
        port,
        rpcuser,
        rpcpassword,

        createClient: function(rpcwallet = null) {
            return RPC(
                this.host,
                this.port,
                this.rpcuser,
                this.rpcpassword,
                rpcwallet
            )
        },

        getLoadedWallets: async function() {
            const rpc = this.createClient()
            return await rpc('listwallets')
        },

        isWalletLoaded: async function(rpcwallet) {
            const wallets = await this.getLoadedWallets()
            for(const w of wallets) {
                if(w === rpcwallet) {
                    return true
                }
            }
            return false
        },

        loadWallet: async function(rpcwallet) {
            if(await this.isWalletLoaded(rpcwallet)) {
                return
            }

            const rpc = this.createClient()
            await rpc('loadwallet', rpcwallet)
        },

        getBalance: async function(rpcwallet) {
            await this.loadWallet(rpcwallet)

            const rpc = this.createClient(rpcwallet)
            return await rpc('getbalance')
        },

        getBalanceMany: async function(rpcwallets, ignoreErrors = true) {
            const p = []

            for(const rpcwallet of rpcwallets) {
                p.push(
                    this.getBalance(rpcwallet)
                        .then((result) => {
                            return {[rpcwallet]: result}
                        })
                        .catch((error) => {
                            const errmsg = `Error getting balance of ${rpcwallet}: ${error}`;
                            if(!ignoreErrors) {
                                throw new Error(errmsg)
                            } else {
                                console.info(errmsg)
                            }
                        })
                )
            }

            const results = await Promise.all(p)

            let result = {}

            for(const item of results) {
                result = Object.assign({}, result, item)
            }

            return result
        },

        getWalletInfos: async function() {

            const loadedMark = {}

            for(const rpcwallet of await this.getLoadedWallets()) {
                loadedMark[rpcwallet] = true
            }

            const result = {}

            for(const walletsFile of await glob('/storage/.wallets.*json')) {

                const wallets = JSON.parse(fs.readFileSync(walletsFile, 'utf8'))

                for(const walletInfo of wallets) {
                    const w = walletInfo.rpcwallet

                    if(typeof loadedMark[w] === undefined) {
                        try {
                            console.info(`Loading wallet ${w} @ node`)
                            await this.loadWallet(w)
                            loadedMark[w] = true
                            result[w] = walletInfo
                        } catch(e) {
                            console.info(`Failed to load wallet ${w}: ${e}`)
                        }
                    } else if(typeof result[w] === undefined) {
                        result[w] = walletInfo
                    } else {
                        result[w] = walletInfo
                        console.debug(`Wallet ${w} is already loaded`)
                    }
                }
            }

            return Object.values(result)
        },

        getAccounts: function(walletInfos, ignoreErrors = true) {
            const p = []


            for(const w of walletInfos) {
                p.push(this.dumpAccount(w.rpcwallet, w.address, w.passphrase))
            }

            return Promise.all(p)
        },

         dumpAccount: async function(rpcwallet, address, passphrase) {
            const rpc = this.createClient(rpcwallet)

             await rpc('walletpassphrase', [passphrase, 60])

             const privkey = await rpc('dumpprivkey', address)

             return {
                rpcwallet,
                 address,
                 passphrase,
                 privkey,
             }
         }
    }
}