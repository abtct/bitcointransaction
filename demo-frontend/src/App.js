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
    sendResponse: '',
    amount: 0.002,
    receiver: '',
  }

  componentDidMount() {
    this.setState({ balanceResponse: '...' }, () => {

      this.getBalance()
          .then(res => this.setState({ balanceResponse: res }))
          .catch(err => console.log(err))

    })
  }

  getBalance = async () => {
    const response = await fetchAPI('/api/balance')
    const body = await response.json()
    
    if (body.error) 
      throw Error(body.error)

    return body
  }

  handleSubmit = async e => {
    e.preventDefault()

    this.setState({ sendResponse: '...' })

    const response = await fetchAPI('/api/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: parseFloat(this.state.amount),
        receiver: this.state.receiver,
      }),
    })
    const body = await response.json()

    this.setState({ sendResponse: body })
  }

  render() {
    return (
        <div className="App">

          { this.state.balanceResponse
          ? (<pre style={{height:'auto', width:'100%'}}>
              {
                JSON.stringify(this.state.balanceResponse, null, 2)

              }
            </pre>)
          : ''}

          <form onSubmit={this.handleSubmit}>
            <p>
              <strong>Consolidation transaction</strong>
            </p>

            <div style={{width:500,textAlign:'right'}}>
              <label htmlFor="receiver">Receiver</label>
              <input required type="text"
                     style={{width: '60%'}}
                     id="receiver"
                     value={this.state.receiver}
                     onChange={e => this.setState({receiver: e.target.value})}
              />
            </div>
            
            <div style={{width:500,textAlign:'right'}}>
              <label htmlFor="transfer_amount">Amount</label>
              <input required type="number" step="0.0001"
                     style={{width: '60%'}}
                     id="transfer_amount"
                     value={this.state.amount}
                     onChange={e => this.setState({amount: e.target.value})}
              />
            </div>

            <p>
              <button type="submit">Send</button>
              <button type="reset">Clear</button>
            </p>

            { this.state.sendResponse
                ? (<pre style={{height:'auto', width:'100%'}}>
                  {
                    JSON.stringify(this.state.sendResponse, null, 2)
                  }
            </pre>)
                : ''}
            
          </form>
        </div>
    )
  }
}

export default App