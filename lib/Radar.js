'use strict';
const Bee = require('./Bee')


// The bee radar tell it which bees you want to find, and it'll find them
module.exports = class Radar {

  // the number of milliseconds this takes to sweep for bees
  constructor (speed) {
    this.speed = speed
  }

  search (ids, callback) {

    const time = Date.now()

    const bees = ids.map( id => new Bee(id, time) )

    bees
      .forEach(bee => {

        // how long it takes for the radar to reach the bee
        let angle = Math.atan2(bee.x(), bee.y())

        if (angle < 0){
          angle = angle + (Math.PI * 2)
        }

        // 0 -> 1
        angle = angle / (Math.PI * 2)

        const delay = angle * this.speed

        setTimeout(
          callback,
          delay,
          bee
        )

      })
  }

}
