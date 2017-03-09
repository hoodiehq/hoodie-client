var test = require('tape')

var Hoodie = require('../../index')
var PouchDBMock = require('./utils/pouchdb')

test('has "url" property', function (t) {
  var exampleUrl = 'http://example.com'
  var hoodieExampleUrl = exampleUrl + '/hoodie'
  var specifiedUrlHoodie = new Hoodie({
    url: exampleUrl,
    PouchDB: PouchDBMock
  })
  t.is(specifiedUrlHoodie.url, hoodieExampleUrl, 'url is retained after being passed in')
  t.end()
})
