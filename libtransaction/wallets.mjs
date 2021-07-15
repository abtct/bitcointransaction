
import RPC from './rpc.mjs'

export default {
    withRpc: function(config) {
        return {
            config: config,

            createClient: function(rpcwallet = null) {
                return RPC(
                    this.config.host,
                    this.config.port,
                    this.config.rpcuser,
                    this.config.rpcpassword,
                    rpcwallet
                )
            },

            getBalance: function() {
                const rpc = this.createClient('wl25X9bY')
                return rpc('getbalance')
            }
        }
    }
}