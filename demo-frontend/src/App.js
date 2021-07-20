import React, { Component } from 'react'

import './App.css'

async function fetchAPI(url, options) {

  let apiHost = 'http://work.people-bitcoins.ru:8086'

  const location = window.location;

  if (location.hostname === "localhost" || location.hostname === "127.0.0.1" || location.hostname === "") {
    apiHost = 'http://127.0.0.1:8086'
  }

  let apiUrl = url

  if(url.startsWith('/')) {
    apiUrl = apiHost + url
  }

  console.warn({
    url,
    apiHost,
    apiUrl,
  })

  return await fetch(apiUrl, options)
}

window.fetchAPI = fetchAPI

class App extends Component {
  state = {
    balanceResponse: '',
    actionResponse: '',

    generate: {
      amount: 0.002,
      receiver: '',
      feeRate: 15,
      changeAddress: '',
    },

    manager: {
      login: 'peoplebitcoins',
      pass: 'ssiuhiu^&yhweiu',
      useCache: true,
      amount: 0.002,
      receiver: '',
      changeAddress: '',
    }
  }

  hasGeneratedTransaction() {
    return !!this.state.transactionHex
  }

  hasSentTransaction() {
    return !!this.state.actionResponse.sendRawTransactionResponse
  }

  hasResponseInputAddresses() {
    return !!this.state.inputAddresses
  }

  async componentDidMount() {
    await this.showBalance()
  }

  showBalance = async e => {
    if(e) e.preventDefault()

    this.setState({ balanceResponse: '...' }, async () => {

      const response = await fetchAPI('/api/balance')
      const body = await response.json()

      this.setState({balanceResponse: body})
    })
  }

  generateRaw = async e => {
    if(e) e.preventDefault()

    this.setState({actionResponse: '...'}, async () => {

      const response = await fetchAPI('/api/generate/consolidation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(this.state.generate.amount),
          receiver: this.state.generate.receiver,
          feeRate: parseFloat(this.state.generate.feeRate),
          changeAddress: this.state.generate.changeAddress,
        }),
      })
      const body = await response.json()

      this.setState({
          actionResponse: body,
          transactionHex: body.transactionHex,
      })
    })
  }

  generateManager = async e => {
    if(e) e.preventDefault()

    this.setState({actionResponse: '...'}, async () => {

      const response = await fetchAPI('/api/generate/manager', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({

          login: this.state.manager.login,
          pass: this.state.manager.pass,

          wallets: null, // use server wallets

          useCache: this.state.manager.useCache,

          receivers: [
            {
              address: this.state.manager.receiver,
              btc: parseFloat(this.state.manager.amount),
            }
          ],

          changeAddress: this.state.manager.changeAddress

        }),
      })
      const body = await response.json()

      this.setState(prevState => ({
        ...prevState,
        actionResponse: body,
        inputAddresses: body.inputAddresses,
        transactionHex: body.transactionHex,
      }))
    })
  }

  sendTransaction = async e => {
    if(e) e.preventDefault()

    this.setState({actionResponse: '...'}, async () => {
      const response = await fetchAPI('/api/send/transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            login: this.state.manager.login,
            pass: this.state.manager.pass,
            transactionHex: this.state.transactionHex,
        }),
      })
      const body = await response.json()

      this.setState({actionResponse: body})
    })
  }

  deleteCaches = async e => {
    if(e) e.preventDefault()

    this.setState({actionResponse: '...'}, async () => {

      const response = await fetchAPI('/api/cache/address-metadata', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({

          login: this.state.manager.login,
          pass: this.state.manager.pass,
          addresses: this.state.inputAddresses,

        }),
      })
      const body = await response.json()

      this.setState({actionResponse: body})
    })

  }

  render() {
    return (
        <div className="App">

          <div className="row">

            <div className="column">

              <form onSubmit={this.generateRaw}>
                <p>
                  <strong>POST /api/generate/consolidation</strong>
                </p>

                <div className="input-group">
                  <label htmlFor="transfer_fee_rate">Fee rate (satoshi / b)</label>
                  <input required type="number" step="1"
                         id="transfer_fee_rate"
                         value={this.state.feeRate}
                         onChange={e => this.setState(prevState => (
                             {
                               ...prevState,
                               generate: {
                                 ...prevState.generate,
                                 feeRate: e.target.value
                               }
                             }
                         ))}
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="transfer_change_address">Change receiver</label>
                  <input required type="string"
                         id="transfer_change_address"
                         value={this.state.changeAddress}
                         onChange={e => this.setState(prevState => (
                             {
                               ...prevState,
                               generate: {
                                 ...prevState.generate,
                                 changeAddress: e.target.value
                               }
                             }
                         ))}
                  />
                </div>

                <br />

                <div className="input-group">
                  <label htmlFor="receiver">To</label>
                  <input required type="text"
                         id="receiver"
                         value={this.state.generate.receiver}
                         onChange={e => this.setState(prevState => (
                             {
                               ...prevState,
                               generate: {
                                 ...prevState.generate,
                                 receiver: e.target.value
                               }
                             }
                         ))}
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="transfer_amount">Amount</label>
                  <input required type="number" step="0.0001"
                         id="transfer_amount"
                         value={this.state.generate.amount}
                         onChange={e => this.setState(prevState => (
                             {
                               ...prevState,
                               generate: {
                                 ...prevState.generate,
                                 amount: e.target.value
                               }
                             }
                         ))}
                  />
                </div>

                <p>
                  <button type="submit" disabled={this.hasGeneratedTransaction()}>Generate</button>
                </p>

              </form>

              <form onSubmit={this.generateManager}>
                <p>
                  <strong>POST /api/generate/manager</strong>
                </p>

                <div className="input-group">
                  <label htmlFor="manager_login">Login</label>
                  <input required type="text"
                         id="manager_login"
                         value={this.state.manager.login}
                         onChange={e => this.setState(prevState => (
                             {
                               ...prevState,
                               manager: {
                                 ...prevState.manager,
                                 login: e.target.value
                               }
                             }
                         ))}
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="manager_pass">Pass</label>
                  <input required type="text"
                         id="manager_pass"
                         value={this.state.manager.pass}
                         onChange={e => this.setState(prevState => (
                             {
                               ...prevState,
                               manager: {
                                 ...prevState.manager,
                                 pass: e.target.value
                               }
                             }
                         ))}
                  />
                </div>

                <br />

                <div className="input-group">
                  <label htmlFor="transfer_manager_change_address">Change receiver</label>
                  <input required type="string"
                         id="transfer_manager_change_address"
                         value={this.state.manager.changeAddress}
                         onChange={e => this.setState(prevState => (
                             {
                               ...prevState,
                               manager: {
                                 ...prevState.manager,
                                 changeAddress: e.target.value
                               }
                             }
                         ))}
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="use_cache">Use cache</label>
                  <input type="checkbox"
                         id="use_cache"
                         checked={this.state.manager.useCache}
                         onChange={e => this.setState(prevState => (
                             {
                               ...prevState,
                               manager: {
                                 ...prevState.manager,
                                 useCache: e.target.checked
                               }
                             }
                         ))}
                  />
                </div>

                <br />

                <div className="input-group">
                  <label htmlFor="receiver_manager">To</label>
                  <input required type="text"
                         id="receiver_manager"
                         value={this.state.manager.receiver}
                         onChange={e => this.setState(prevState => (
                             {
                               ...prevState,
                               manager: {
                                 ...prevState.manager,
                                 receiver: e.target.value
                               }
                             }
                         ))}
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="transfer_manager_amount">Amount</label>
                  <input required type="number" step="any"
                         id="transfer_manager_amount"
                         value={this.state.manager.amount}
                         onChange={e => this.setState(prevState => (
                             {
                               ...prevState,
                               manager: {
                                 ...prevState.manager,
                                 amount: e.target.value
                               }
                             }
                         ))}
                  />
                </div>

                <p>
                  <button type="submit" disabled={this.hasGeneratedTransaction()}>Generate</button>
                </p>

              </form>

              <form onSubmit={this.sendTransaction}>
                <p>
                  <strong>POST /api/send/transaction</strong>
                </p>


                <div className="input-group">
                  <label htmlFor="manager_login3">Login</label>
                  <input required type="text"
                         id="manager_login3"
                         value={this.state.manager.login}
                         onChange={e => this.setState(prevState => (
                             {
                               ...prevState,
                               manager: {
                                 ...prevState.manager,
                                 login: e.target.value
                               }
                             }
                         ))}
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="manager_pass3">Pass</label>
                  <input required type="text"
                         id="manager_pass3"
                         value={this.state.manager.pass}
                         onChange={e => this.setState(prevState => (
                             {
                               ...prevState,
                               manager: {
                                 ...prevState.manager,
                                 pass: e.target.value
                               }
                             }
                         ))}
                  />
                </div>

                <br />

                <div className="input-group">
                  <input required type="textarea" disabled={true}
                         id="t_hex"
                         value={this.state.transactionHex}
                  />
                </div>

                <p>
                  <button type="submit" disabled={!this.hasGeneratedTransaction()}>Send</button>
                  <button type="clear" disabled={!this.hasGeneratedTransaction()}

                          onClick={e => this.setState(prevState => (
                              {
                                ...prevState,
                                  transactionHex: ''
                              }
                          ))}>
                    Reset
                  </button>
                </p>

              </form>

              <form onSubmit={this.deleteCaches}>
                <p>
                  <strong>DELETE /api/cache/address-metadata</strong>
                </p>

                <div className="input-group">
                  <label htmlFor="manager_login2">Login</label>
                  <input required type="text"
                         id="manager_login2"
                         value={this.state.manager.login}
                         onChange={e => this.setState(prevState => (
                             {
                               ...prevState,
                               manager: {
                                 ...prevState.manager,
                                 login: e.target.value
                               }
                             }
                         ))}
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="manager_pass2">Pass</label>
                  <input required type="text"
                         id="manager_pass2"
                         value={this.state.manager.pass}
                         onChange={e => this.setState(prevState => (
                             {
                               ...prevState,
                               manager: {
                                 ...prevState.manager,
                                 pass: e.target.value
                               }
                             }
                         ))}
                  />
                </div>

                <br />

                <div className="input-group">
                  { this.state.inputAddresses
                      ? (<pre>
                    {
                      JSON.stringify(this.state.inputAddresses, null, 2)

                    }
                  </pre>)
                      : ''}
                </div>


                <p>
                  <button type="submit" disabled={!this.hasResponseInputAddresses()}>Delete</button>
                </p>

              </form>

            </div>

            <div className="column">

              <form>
                <p>
                  <strong>GET /api/balance</strong>
                </p>

                <button onClick={this.showBalance}>Load</button>

                <div className="input-group">
                  { this.state.balanceResponse
                      ? (<pre>
                    {
                      JSON.stringify(this.state.balanceResponse, null, 2)

                    }
                  </pre>)
                      : ''}
                </div>

              </form>

              <form>
                <p>
                  <strong>Action response</strong>
                </p>

                <button disabled={!this.state.actionResponse || this.state.actionResponse === '...'}
                        onClick={() => this.setState({actionResponse: ''})}>Reset</button>

                { this.state.actionResponse
                    ? (<pre>
                  {
                    JSON.stringify(this.state.actionResponse, null, 2)
                  }
            </pre>)
                    : ''}
              </form>

            </div>

          </div>

        </div>
    )
  }
}

export default App