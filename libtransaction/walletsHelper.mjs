import RPC from './rpc.mjs'
import fs from 'fs'
import glob from 'glob-promise'

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

        getTotalBalance: async function(rpcwallets, ignoreErrors = true) {
            const p = []

            for(const rpcwallet of rpcwallets) {
                p.push(
                    this.getBalance(rpcwallet)
                        .catch((error) => {
                            if(!ignoreErrors) {
                                throw new Error(`Error getting balance of ${rpcwallet}: ${error}`)
                            }
                        })
                )
            }

            const nums = await Promise.all(p)

            return nums.reduce((a, b) => a + b)
        },

        getWalletInfos: async function() {

            let wallets = []

            let loaded = await this.getLoadedWallets()

            const isLoaded = function(k) {
                for(const kk of loadedWallets) {
                    if(k === kk) {
                        return true
                    }
                }
                return false
            }

            const walletInfos = {}

            const files = glob("/storage/wallets*json");

            for(const file of files) {
                const data = JSON.parse(fs.readFileSync(file, 'utf8'))
                for(const item of data) {
                    const rpcwallet = item.rpcwallet

                    if(!isLoaded(rpcwallet)) {
                        try {
                            await this.loadWallet(rpcwallet)
                            loaded.push(rpcwallet)
                            walletInfos[rpcwallet] = item
                        } catch(e) {
                            console.info(`Failed to load wallet ${rpcwallet}: ${e}`)
                        }
                    } else if(typeof walletInfos[rpcwallet] === undefined) {
                        walletInfos[rpcwallet] = item
                    }
                }
            }

            return walletInfos
        },
    }
}