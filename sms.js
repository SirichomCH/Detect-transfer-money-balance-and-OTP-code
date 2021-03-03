const WebSocket = require('ws')
const axios = require('axios')
const { match } = require('assert')

const ws = new WebSocket(
  'wss://stream.pushbullet.com/websocket/o.zGtbncYswJwipGlbHJyFBpCLxdL47PTd',
  {
    perMessageDeflate: false
  }
)

ws.on('open', function open() {
  console.log('connected')
})

ws.on('close', function close() {
  console.log('disconnected')
})

ws.on('error', function close() {
  console.log('error')
})

ws.on('message', function incoming(data) {
  data = JSON.parse(data)
  if (data.hasOwnProperty('push')) {
    if (
      data.push.hasOwnProperty('type') &&
      data.push.hasOwnProperty('notifications')
    ) {
      if (data.push.type === 'sms_changed') {
        data.push.notifications.forEach((element) => {
          if (
            element.hasOwnProperty('title') &&
            element.hasOwnProperty('body')
          ) {
            console.log(element)
            let n = element.title
            let b = element.body
            let ref_regex = null
            let otp_regex = null
            let OTP = b.includes('OTP')
            if (OTP) {
              switch (n) {
                case 'KBank':
                  ref_regex = /Ref=([A-Z]{4})/gm
                  otp_regex = /OTP=([0-9]{6})/gm
                  break
                case '027777777':
                  ref_regex = /Ref\. ([A-Z0-9]{4})/gm
                  otp_regex = /OTP ([0-9]{6})/gm
                  break
                case 'Krungsri':
                  ref_regex = /Ref:([A-Z0-9]{4})/gm
                  otp_regex = /OTP:([0-9]{6})/gm
                  break
              }
              let r
              let o
              let ref
              let otp

              while ((r = ref_regex.exec(element.body)) !== null) {
                if (r.index === ref_regex.lastIndex) {
                  ref_regex.lastIndex++
                }

                ref = r[1]
              }

              while ((o = otp_regex.exec(element.body)) !== null) {
                if (o.index === otp_regex.lastIndex) {
                  otp_regex.lastIndex++
                }

                otp = o[1]
              }
              console.log(`GETTING REF=${ref} OTP=${otp}`)
            } else {
              if (b.includes('เหลือ')) {
                const regex = /(\d{0,3},)?(\d{3},)?\d{0,3}\.([0-9]{2})/
                let amount

                if ((m = regex.exec(b)) !== null) {
                  m.forEach((match, groupIndex) => {
                    if (groupIndex === 0) {
                      amount = match
                    }
                  })
                }

                console.log(`GETTING AMOUNT=${amount}`)
              }
            }
          }
        })
      }
    }
  }
})