import RPC from './rpc.mjs'

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

        getWallets: async function() {
            const rpc = this.createClient()
            return await rpc('listwallets')
        },

        isWalletLoaded: async function(rpcwallet) {
            const wallets = await this.getWallets()
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
    }
}