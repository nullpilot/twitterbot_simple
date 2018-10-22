const axios = require('axios')
const ENDPOINT = 'http://api.coindesk.com/v1/bpi/currentprice.json'
const DEBUG = process.env.DEBUG !== 'false'

class TrackUSD {
  constructor(interval) {
    this.lastRate = 0
    this.lastUpdated = 0
    this.lastResponse = null
    this.interval = interval

    this.queryRate = this.queryRate.bind(this)

    this.start()
    this.queryRate()
  }

  start() {
    this.intervalId = setInterval(this.queryRate, this.interval)
  }

  stop() {
    clearInterval(this.intervalId)
    this.intervalId = 0
  }

  getLastRate() {
    return this.lastRate
  }

  queryRate() {
    return axios.get(ENDPOINT, { params: { json: true }}).then(res => {
      this.lastResponse = res
      this.lastRate = res.data.bpi.USD.rate_float
      this.lastUpdated = new Date(res.data.updatedISO)

      if(DEBUG) {
        console.info('Updated USD rate:', this.lastRate)
      }

      return Promise.resolve(this.lastRate)
    })
  }
}

module.exports = TrackUSD
