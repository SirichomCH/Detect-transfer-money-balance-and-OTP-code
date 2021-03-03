const rdHost = process.env.RD_HOST || '127.0.0.1'
const rdPort = process.env.RD_PORT || 6379
const rdPassword = process.env.RD_PASSWORD || ''

const webSocket = require('ws')
const redis = require('redis')
const dateTime = require('node-datetime')

const rd = redis.createClient({
  host: rdHost,
  port: rdPort,
  password: rdPassword
})

const ws = new webSocket(
  'wss://stream.pushbullet.com/websocket/o.jClfH1XdgtWCZC8kc4oCxGMooRAiXsc2',
  {
    perMessageDeflate: false
  }
)

rd.on('connect', function () {
  console.error(`[${dateTime.create().format('Y-m-d H:M:S')}] Redis connected!`)
})

rd.on('reconnecting', function () {
  console.error(
    `[${dateTime.create().format('Y-m-d H:M:S')}] Redis reconnected!`
  )
})

rd.on('ready', function () {
  console.error(`[${dateTime.create().format('Y-m-d H:M:S')}] Redis ready!`)
})

rd.on('end', function () {
  console.error(`[${dateTime.create().format('Y-m-d H:M:S')}] Redis ended!`)
})

rd.on('error', function (error) {
  console.error(
    `[${dateTime.create().format('Y-m-d H:M:S')}] Redis errors => ${error}`
  )
})

ws.on('open', function open() {
  console.log(
    `[${dateTime.create().format('Y-m-d H:M:S')}] PushBullet socket connected!`
  )
})

ws.on('close', function close() {
  console.log(
    `[${dateTime
      .create()
      .format('Y-m-d H:M:S')}] PushBullet socket disconnected!`
  )
})

ws.on('error', function close(error) {
  console.log(
    `[${dateTime.create().format('Y-m-d H:M:S')}] PushBullet errors => ${error}`
  )
})

ws.on('message', function incoming(data) {
  data = JSON.parse(data)
  let keepAlive = rd.set('KEEPALIVE', 'KEEPALIVE', 'EX', 1)
  console.log(
    `[${dateTime
      .create()
      .format(
        'Y-m-d H:M:S'
      )}] Redis keep alive saved => ${keepAlive}, PushBullet received message! => ${JSON.stringify(
      data
    )}`
  )
  if (data.hasOwnProperty('push')) {
    if (
      data.push.hasOwnProperty('type') &&
      data.push.hasOwnProperty('notifications')
    ) {
      if (data.push.type === 'sms_changed') {
        data.push.notifications.forEach((notification) => {
          if (
            notification.hasOwnProperty('title') &&
            notification.hasOwnProperty('body')
          ) {
            let title = notification.title
            let body = notification.body
            let BANK = null
            let regexREF = null
            let regexOTP = null
            let isOTP = body.includes('OTP')
            if (isOTP) {
              switch (title) {
                case 'KBank':
                  regexREF = /Ref=([A-Z]{4})/gm
                  regexOTP = /OTP=([0-9]{6})/gm
                  BANK = 'KBank'
                  break
                case '027777777':
                  regexREF = /Ref\. ([A-Z0-9]{4})/gm
                  regexOTP = /OTP ([0-9]{6})/gm
                  BANK = 'SCB'
                  break
                case 'Krungsri':
                  regexREF = /Ref:([A-Z0-9]{4})/gm
                  regexOTP = /OTP:([0-9]{6})/gm
                  BANK = 'KMA'
                  break
              }
              let resultRegexREF
              let resultRegexOTP
              let REF
              let OTP

              while (
                (resultRegexREF = regexREF.exec(notification.body)) !== null
              ) {
                if (resultRegexREF.index === regexREF.lastIndex) {
                  regexREF.lastIndex++
                }

                REF = resultRegexREF[1]
              }

              while (
                (resultRegexOTP = regexOTP.exec(notification.body)) !== null
              ) {
                if (resultRegexOTP.index === regexOTP.lastIndex) {
                  regexOTP.lastIndex++
                }

                OTP = resultRegexOTP[1]
              }

              let storedOTP = rd.set(REF, OTP, 'EX', 60 * 15)
              console.log(
                `[${dateTime
                  .create()
                  .format(
                    'Y-m-d H:M:S'
                  )}] Redis saved => ${storedOTP}, Detected OTP => { "BANK":"${BANK}", "REF":"${REF}", "OTP":"${OTP}" }`
              )
            } else {
              if (body.includes('เหลือ')) {
                const regex = /(\d{0,3},)?(\d{3},)?\d{0,3}\.([0-9]{2})/
                let amount

                if ((m = regex.exec(body)) !== null) {
                  m.forEach((match, groupIndex) => {
                    if (groupIndex === 0) {
                      amount = match
                    }
                  })
                }

                console.log(
                  `[${dateTime
                    .create()
                    .format('Y-m-d H:M:S')}] GETTING AMOUNT=${amount}`
                )
              }
            }
          }
        })
      }
    }
  }
})
