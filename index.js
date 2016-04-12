require('dotenv').config({silent:true})

const Radar = require('./lib/Radar')

const Pusher = require('pusher')
const express = require('express')
const getRawBody = require('raw-body')
const exphbs  = require('express-handlebars');

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


app.engine('html', exphbs())
app.set('view engine', 'html')
app.set('views', __dirname + '/public')

app.get('/', (req, res) => {

  const bees = (req.query.bees||'').split(',')
                .map(b => parseInt(b, 10))
                .filter(isFinite)
                // .filter(b => b < 100)
                .slice(0, 10)

  if(bees.length) {
    res.render('index', {
      bodyData: {
        key: process.env.PUSHER_APP_KEY,
        cluster: process.env.PUSHER_CLUSTER,
        bees: bees
      }
    })
  } else {
    res.render('problem', {
      url: '/?bees=' + Array.from({length: 6}, _ => Math.ceil(Math.random() * 100)).join(',')
    })
  }

} )

// also expose a test script and key
app.use(express.static('public'))


app.listen(process.env.PORT || 3000)




/*
  Publish events
*/

// a radar that takes 1000ms to sweep around looking for bees
const radar = new Radar(1000)


// roughly every second, check to see if
// there are any channels that need posting to
const sweep = () => {

  // find out which bees people are watchine
  const ids = Array.from(channels)
                   .map(name => parseInt(name, 10))
                   .filter(isFinite)

  radar.search(
    ids,
    bee => {
      client.trigger(String(bee.id), 'move', bee.data())
    }
  )

  // sweep again around .5s past the second
  setTimeout(sweep, 1500 - (Date.now() % 1000) )

}
sweep()
