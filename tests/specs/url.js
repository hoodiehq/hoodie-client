var simple = require('simple-mock')
var test = require('tape')

var Hoodie = require('../../index')

var PouchDBMock = simple.stub()
simple.mock(PouchDBMock, 'defaults').returnWith(PouchDBMock)

test('has "url" property', function (t) {
  t.plan(3)

  simple.mock(global, 'location', {
    origin: 'http://localhost:1234'
  })
  var defaultHoodie = new Hoodie({
    PouchDB: PouchDBMock
  })
  var hoodieDefaultUrl = 'http://localhost:1234/hoodie'
  t.is(typeof defaultHoodie.url, 'string', 'has a url')
  t.is(defaultHoodie.url, hoodieDefaultUrl, 'url has a default value')

  var exampleUrl = 'http://example.com'
  var hoodieExampleUrl = exampleUrl + '/hoodie'
  var specifiedUrlHoodie = new Hoodie({
    url: exampleUrl,
    PouchDB: PouchDBMock
  })
  t.is(specifiedUrlHoodie.url, hoodieExampleUrl, 'url is retained after being passed in')

  simple.restore()
})
