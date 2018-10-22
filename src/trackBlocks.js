const WebSocket = require('ws')
const EventEmitter = require('events')

const ENDPOINT = 'wss://ws.blockchain.info/inv'

class TrackBlocks extends EventEmitter {
  constructor() {
    super()

    this.isAlive = false
    this.ack = this.ack.bind(this)

    this.start()
  }

  start() {
    const ws = this.ws = new WebSocket(ENDPOINT)

    ws.on('message', r => {
      this.message(JSON.parse(r))
    });

    ws.on('open', function open() {
      send(ws, {op:'ping'}, this.ack)
      send(ws, {op:'blocks_sub'}, this.ack)
    });
  }

  message(data) {
    switch(data.op) {
      case 'block':
        console.log('New block: ', new Date(block.x.time), block.x.hash)
        this.emit('block', data.x)
        break;
      case 'pong':
        console.log('Block Tracker: Connection established.')
        break;
      default:
        const err = new Error('Unhandled Socket event in Block Tracker:' + data.op)
        this.emit('error', err)
    }
  }

  ack(error) {
    if(error) {
      this.emit('error', error)
    }
  }
}

module.exports = TrackBlocks

// Utility
function send(ws, payload) {
  ws.send(JSON.stringify(payload))
}
