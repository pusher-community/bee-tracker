
var scene = new THREE.Scene()
scene.fog = new THREE.Fog(0xffffff, 1,3)

var camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 )
camera.position.z = 2

var axisHelper = new THREE.AxisHelper( .2 )
scene.add( axisHelper )

var renderer = new THREE.WebGLRenderer({antialias:true})
renderer.setClearColor(0xffffff)
renderer.setSize( window.innerWidth, window.innerHeight )

document.body.appendChild( renderer.domElement )


// A thing for drawing lines
var lineSegment = (function(scene){

  var n = 750

  var geometry = new THREE.BufferGeometry()
  var vertices = new Float32Array(n * 3)
  var colors = new Float32Array(n * 3)

  geometry.addAttribute('position', new THREE.BufferAttribute( vertices, 3 ) )
  geometry.addAttribute('color', new THREE.BufferAttribute( colors, 3 ) )
  geometry.setDrawRange(0, 1)

  var material = new THREE.LineBasicMaterial({
    color: 0xffffff, opacity: 1, linewidth: 2,
    vertexColors: THREE.VertexColors
  })

  var line = new THREE.LineSegments(geometry, material)
  scene.add(line)

  var drawn = 0

  return function lineSegment(a, b, color){

    const i = drawn % n

    vertices[i*3 + 0] = a.x
    vertices[i*3 + 1] = a.y
    vertices[i*3 + 2] = a.z

    vertices[i*3 + 3] = b.x
    vertices[i*3 + 4] = b.y
    vertices[i*3 + 5] = b.z

    colors[i*3 + 0] = colors[i*3 + 3] = color.r
    colors[i*3 + 1] = colors[i*3 + 4] = color.g
    colors[i*3 + 2] = colors[i*3 + 5] = color.b


    geometry.attributes.position.needsUpdate = true
    geometry.attributes.color.needsUpdate = true

    // this might be a problem in some case
    // geometry.computeBoundingBox()

    // we've added two points
    drawn += 2

    if(drawn < n) {
      geometry.setDrawRange( 0,  drawn)
    }

  }
})(scene)




// an id => position map of bees
var bees = {}

function plot(id, position, color) {

  if(!bees[id])
    return bees[id] = makeBee(position, color, id)

  lineSegment(bees[id], position, color)

  bees[id].set(position.x,position.y,position.z)

}





function makeBee(position, color, name) {

  // sphere
  var geometry = new THREE.SphereGeometry( .02, 32, 32 )
  var material = new THREE.MeshBasicMaterial( {color: color} )
  var sphere = new THREE.Mesh( geometry, material )


  // text label
  var canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  var ctx = canvas.getContext('2d')

  ctx.font = '40px Arial'
  ctx.textBaseline = 'bottom'
  ctx.fillStyle = color.getStyle()
  ctx.fillText( name, 0, 128)

  var texture = new THREE.Texture(canvas)
  texture.needsUpdate = true

  var label = new THREE.Sprite( new THREE.SpriteMaterial({ map: texture } ) )
  label.scale.set(0.35,0.35,0.35)
  label.position.set(.2,0.2,0)


  // together
  var base = new THREE.Object3D()
  base.add(sphere)
	base.add(label)
  scene.add(base)

  base.position.set(position.x,position.y,position.z)

  // we're only going to update the position from now on
  return base.position
}





// draw stuff, and turn it around
scene.rotation.x = 0.2

function render (t) {
  requestAnimationFrame( render )
  scene.rotation.y += 0.001
  renderer.render(scene, camera)
}
render()

// right key (more for testing than use)
document.addEventListener('keydown', function(e) {
  if(e.keyCode == 39) scene.rotation.y += .2
})



var config = document.body.dataset


var pusher = new Pusher(config.key, {
  encrypted: true,
  cluster: config.cluster
})


config.bees.split(',').forEach( function(name) {
  pusher
    .subscribe(name)
    .bind('move', function(data) {
      plot(name, new THREE.Vector3(data.x, data.y, data.z), new THREE.Color(data.color))
    })

})
