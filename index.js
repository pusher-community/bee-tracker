require('dotenv').config({silent:true})

const Pusher = require('pusher')
const faker = require('faker')
const express = require('express')
const getRawBody = require('raw-body')

const client = new Pusher({
  appId:   process.env.PUSHER_APP_ID,
  key:     process.env.PUSHER_APP_KEY,
  secret:  process.env.PUSHER_SECRET_KEY,
  cluster: process.env.PUSHER_CLUSTER
})

const channels = new Set()

// initially populate list of channels from api request
client.get(
  { path: '/channels', params: {} },
  (error, request, response) => {

    const json = JSON.parse(response.body)

    Object.keys(json.channels)
      .forEach( c => channels.add(c) )

    console.log("channels:", channels)
  }
)



/*
  Keep channel list up to date with webhooks
*/

const app = express()

const rawBodyMiddleware = (req, res, next) => {
  getRawBody(req, {encoding: 'utf8'})
    .then( body => {
      req.rawBody = body
      next()
    })
    .catch( next )
}

app.post('/', rawBodyMiddleware, (req, res) => {

  const webhook = client.webhook(req)

  if(!webhook.isValid())
    return res.sendStatus(400)

  else
    res.sendStatus(200)

  webhook.getEvents().forEach( e => {

    if(e.name == 'channel_occupied')
      channels.add(e.channel)

    if(e.name == 'channel_vacated')
      channels.delete(e.channel)

  })

  console.log("channels:", channels)
})

// also expose a test script and key
app.get('/', (req, res) => {
  res.sendFile('index.html', {root: __dirname})
})
app.get('/config', (req, res) => {
  res.send({
    key: process.env.PUSHER_APP_KEY,
    cluster: process.env.PUSHER_CLUSTER
  })
})


app.listen(process.env.PORT || 3000)



/*
  Publish events to any suitable channels
*/

// roughly every second, check to see if
// there are any channels that need posting to
const checkRE = /lorem-(\d+)/
const check = () => {

  const seconds = Math.floor( Date.now() / 1000 )

  Array.from(channels)

    // are they in the right format?
    .map( c => checkRE.exec(c) )
    .filter( m => m )

    // should they fire this second?
    .filter( m => (seconds % parseInt(m[1])) == 0 )

    // cool.
    .forEach( m =>
      client.trigger(m[0], 'message', {
        name:   faker.name.findName(),
        avatar: faker.image.avatar(),
        text:   faker.lorem.sentence()
      })
    )


  // check again around .5s past the second
  setTimeout(check, 1500 - (Date.now() % 1000) )

}
check()
