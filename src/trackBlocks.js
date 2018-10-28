const WebSocket = require('ws')
const EventEmitter = require('events')

const ENDPOINT = 'wss://ws.blockchain.info/inv'

class TrackBlocks extends EventEmitter {
  constructor() {
    super()
    this.ack = this.ack.bind(this)
    this.keepalive = this.keepalive.bind(this)
    this.handleOpen = this.handleOpen.bind(this)
    this.handleClose = this.handleClose.bind(this)
    this.handleError = this.handleError.bind(this)

    this.keepaliveId = 0
    this.keepaliveInterval = 5 * 1000
    this.start()
  }

  start() {
    const ws = this.ws = new WebSocket(ENDPOINT)

    ws.on('open', this.handleOpen)
    ws.on('close', this.handleClose)
    ws.on('error', this.handleError)
    ws.on('message', r => {
      this.message(JSON.parse(r))
    })
  }

  stop() {
    clearInterval(this.keepaliveId)
    this.ws.removeEventListener('open', this.handleOpen)
    this.ws.removeEventListener('close', this.handleClose)
    this.ws.removeEventListener('error', this.handleError)
    this.ws.terminate()
  }

  restart() {
    console.log('Terminating connection. Reconnecting in five seconds.')
    this.stop()

    setTimeout(() => {
      this.start()
    }, 5000)
  }

  handleOpen() {
    console.log('Block Tracker: Connection established.')
    send(this.ws, {op:'blocks_sub'}, this.ack)
    this.isAlive = true
    this.keepaliveId = setInterval(this.keepalive, this.keepaliveInterval)
  }

  handleClose() {
    console.log('Closing connection')
    console.info(arguments)
  }

  handleError(err) {
    console.log('rs', this.ws.READY_STATE)

    console.info(arguments)
    this.emit('error', err)
  }

  keepalive() {
    if(!this.isAlive) {
      console.log('Keepalive timeout.')
      this.restart()
      return
    }

    send(this.ws, {op: 'ping'}, this.ack)
    this.isAlive = false
  }

  message(data) {
    switch(data.op) {
      case 'block':
        console.log('New block: ', new Date(data.x.time), data.x.hash)
        this.emit('block', data.x)
        break
      case 'pong':
        this.isAlive = true
        break
      default:
        const err = new Error('Unhandled Socket event in Block Tracker:' + data.op)
        this.emit('error', err)
    }
  }

  ack(error) {
    if(error) {
      this.emit('error', error)
      this.restart()
    }
  }
}

module.exports = TrackBlocks

// Utility
function send(ws, payload, ack) {
  return ws.send(JSON.stringify(payload), ack)
}
