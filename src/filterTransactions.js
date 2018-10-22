const DEBUG = process.env.DEBUG !== 'false'
const EXPLORER_TX = 'https://www.blockchain.com/btc/tx/'
const EXPLORER_ADDR = 'https://www.blockchain.com/btc/address/'
const EXPLORER_BLOCK = 'https://www.blockchain.com/btc/block/'
const TYPE_SEND = 1
const TYPE_RECEIVE = 2

const axios = require('axios')

class AddressWatcher {
  constructor(senders, receivers, minAmount) {
    this.senders = senders
    this.receivers = receivers
    this.minAmount = minAmount
  }

  queryFromBlock(blockHash) {
    return axios.get('https://blockchain.info/rawblock/' + blockHash).then((response) => {
      const block = response.data
      const transactions = block.tx
      let actions = []

      if(DEBUG) {
        console.log('New block. Checking ', transactions.length, 'transactions.')
      }

      for(let i = 0, j = transactions.length; i < j; i++) {
        const action = this.checkTransaction(transactions[i], block);

        if(action) {
          actions.push(action)
        }
      }

      return Promise.resolve(actions)
    })
  }

  checkTransaction(tx, block) {
    const fee = getFee(tx)
    const highestOutput = getHighestOut(tx)
    const highestInput = getHighestIn(tx)
    const sourceLink = highestInput.prev_out
            ? EXPLORER_ADDR + highestInput.prev_out.addr
            : 'Unspecified'

    const context = {
      blockLink: EXPLORER_BLOCK + block.hash,
      targetLink: EXPLORER_ADDR + highestOutput.addr,
      txLink: EXPLORER_TX + tx.hash,
      block,
      fee,
      highestInput,
      highestOutput,
      sourceLink,
      tx
    }

    for(let i = 0, j = this.senders.length; i < j; i++) {
      const addr = this.senders[i]

      for(let k = 0, l = tx.inputs.length; k < l; k++) {
        const input = tx.inputs[k]

        if(
          input.prev_out
          && input.prev_out.addr === addr
          && input.prev_out.value > this.minAmount
        ) {
          const value = input.prev_out.value

          return Object.assign({
            type: TYPE_SEND,
            addrLink: EXPLORER_ADDR + addr,
            addr,
            input,
            value
          }, context)
        }
      }
    }


    for(let i = 0, j = this.receivers.length; i < j; i++) {
      const addr = this.receivers[i]

      for(let k = 0, l = tx.out.length; k < l; k++) {
        const output = tx.out[k]

        if(output.addr === addr && output.value > this.minAmount) {
          const value = output.value

          return Object.assign({
            type: TYPE_RECEIVE,
            addrLink: EXPLORER_ADDR + addr,
            addr,
            output,
            value,
          }, context)
        }
      }
    }

    return null
  }
}

AddressWatcher.TYPE_RECEIVE = TYPE_RECEIVE
AddressWatcher.TYPE_SEND = TYPE_SEND

module.exports = AddressWatcher

// Utility
function getHighestOut(tx) {
  const outputs = tx.out.slice().sort((a, b) => {
    return b.value - a.value
  })

  return outputs[0]
}

function getHighestIn(tx) {
  const inputs = tx.inputs.slice().sort((a, b) => {
    if(a.hasOwnProperty('prev_out') && b.hasOwnProperty('prev_out')) {
      return b.prev_out.value - a.prev_out.value
    }

    return 0
  })

  return inputs[0]
}

function getFee(tx) {
  const totalInputs = tx.inputs.reduce((acc, input) => {
    if(input.prev_out && input.prev_out.value) {
      acc += input.prev_out.value
    }

    return acc
  }, 0)

  const totalOutputs = tx.out.reduce((acc, output) => {
    if(output.value) {
      acc += output.value
    }
    return acc
  }, 0)

  return totalInputs - totalOutputs
}
