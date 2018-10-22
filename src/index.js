const config = require('dotenv').config()

const d3 = require('d3-format')
const Twit = require('twit')
const Big = require('big.js')
const TrackUSD = require('./trackUSD')
const TrackBlocks = require('./trackBlocks')
const FilterTx = require('./filterTransactions')
const testBlockHash = '00000000000000000015534c5a9a7c7ad0cf6f03da519d3a7fc7b6d89f256cc5'
const addressList = [
  '17oLZtxCzUE4WaCVgRn1Gx4z7PmPYGhmJq',
  '33xzRxzc2N3dcmx3ofCAZhJfzH8h2UdMXF',
  '18wn8H4DhimXQBu3Q7vbNEEw1Uttrty8ZV',
  '3HpFP4RFopNW6UKaeomwnKug2gMR3o9w6u',
  '17A16QmavnUfCW11DAApiJxp7ARnxN5pGX'
]

const DEBUG = process.env.DEBUG !== 'false'
const MIN_AMOUNT = toSatoshi(parseFloat(process.env.MINIMUM_AMOUNT, 10))
const COINDESK_INTERVAL = parseFloat(process.env.COINDESK_INTERVAL, 10)
const T = new Twit({
  consumer_key:         process.env.TWITTER_CONSUMER_KEY,
  consumer_secret:      process.env.TWITTER_CONSUMER_SECRET,
  access_token:         process.env.TWITTER_ACCESS_TOKEN,
  access_token_secret:  process.env.TWITTER_ACCESS_TOKEN_SECRET,
  timeout_ms:           60 * 1000,
  strictSSL:            true,
});

// See https://www.npmjs.com/package/d3-format
const f = d3.format(',.0f')
const fFee = d3.format('~f')
const senders = addressList
const receivers = addressList
const usdTracker = new TrackUSD(COINDESK_INTERVAL * 1000)
const blockTracker = new TrackBlocks()
const filterTx = new FilterTx(senders, receivers, MIN_AMOUNT)
const tweetInterval = setInterval(tweetFromQueue, 1 * 60 * 1000)
let tweets = []

blockTracker.on('block', block => {
  const query = filterTx.queryFromBlock(testBlockHash)

  query.then(filteredTx => {
    filteredTx.forEach(formatAndQueue)
  })
})

function formatAndQueue(t) {
  const btcValue = toBitcoin(t.value)
  const fee = fFee(toBitcoin(t.fee))
  const value = f(btcValue)
  const valueUSD = f(toUSD(btcValue) )

  let message

  // Sent from watched address
  if(t.type === FilterTx.TYPE_SEND) {
    message = `${value} #BTC (${valueUSD} USD) transferred from ${t.addr})

TX: ${t.txLink}
To: ${t.targetLink}
Fee: ${fee} BTC`
  }

  // Received on watched address
  if(t.type === FilterTx.TYPE_RECEIVE) {
    message = `${value} #BTC (${valueUSD} USD) transferred to ${t.addr})

TX: ${t.txLink}
From: ${t.sourceLink}
Fee: ${fee} BTC`
  }

  tweets.push(message)
}

function tweetFromQueue() {
  if(tweets.length === 0) {
    return
  }

  const message = tweets.shift()

  tweet(message).then(res => {
    if(!DEBUG) {
      console.log('Sent tweet:', message)
    }
  }).catch(err => {
    console.warn(err)
    // Add tweet back to queue
    tweets.unshift(message)
  })
}

function tweet(message) {
  if(DEBUG) {
    console.log('Tweet:')
    console.log(message)
    return Promise.resolve(true)
  } else {
    return T.post('statuses/update', { status: message })
  }
}

// Utility

function toBitcoin(sat) {
  const btc = new Big(sat).div(100000000)
  return Number(btc)
}

function toSatoshi(btc) {
  const sat = new Big(btc).times(100000000)
  return Math.floor(Number(sat))
}

function toUSD(btc) {
  return usdTracker.lastRate * btc
}
