'use strict';

const ColorHash = require('color-hash')
const colorHash = new ColorHash({lightness: 0.5})

const SimplexNoise = require('simplex-noise')
const simplex = new SimplexNoise(x => 42)

// some offsets for calcluating the position of a bee - hardcoded
// so we'll pick up where we left off
const s = [1.2, 0.9, 1, 1.1, 0.8, 0.96]


/*
  This is not actually based on a real Bee
*/
module.exports = class Bee {

  constructor (id, time) {
    this.id = parseFloat(id)
    this.t = time / 100000
  }

  x () {
    return simplex.noise2D(this.id * s[0],  this.t * s[3])
  }

  y () {
    return simplex.noise2D(this.id * s[1],  this.t * s[4])
  }

  z () {
    return simplex.noise2D(this.id * s[2],  this.t * s[5])
  }

  color () {
    return  colorHash.hex(this.id)
  }

  data () {
    return {
      id: this.id,
      x: this.x(),
      y: this.y(),
      z: this.z(),
      color: this.color()
    }
  }

}
