var test = require('tape')
var Hoodie = require('../../index')

test('has "reset" method', function (t) {
  t.plan(1)

  var hoodie = new Hoodie()
  t.is(typeof hoodie.reset, 'function', 'has method')
})

test('can reset hoodie state', function (t) {
  var hoodie = new Hoodie({
    url: 'http://127.0.0.1:6022'
  })
  var firstId = hoodie.id
  var secondId

  hoodie.reset().then(function () {
    secondId = hoodie.id
    t.notEqual(firstId, secondId, 'id has changed')
    t.end()
  }).catch(function (e) {
    console.log(e)
  })
})
