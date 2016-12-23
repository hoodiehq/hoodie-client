module.exports = Hoodie

var getState = require('./lib/get-state')
var getApi = require('./lib/get-api')

function Hoodie (options) {
  var state = getState(options)
  var api = getApi(state)

  return api
}
