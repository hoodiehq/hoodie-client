module.exports = Hoodie

var Store = require('hoodie-client-store')
var Account = require('hoodie-client-account')
var Task = function () {}
var ConnectionStatus = require('hoodie-client-connection-status')
var Log = require('hoodie-client-log')

var getState = require('./lib/get-state')
var id = require('./lib/id')

function Hoodie (options) {
  var state = getState(options)

  var api = {
    get id () {
      return id.get(state)
    },
    get url () {
      return state.url + '/hoodie'
    }
  }

  api.on = require('./lib/events').on.bind(this, state)
  api.one = require('./lib/events').one.bind(this, state)
  api.off = require('./lib/events').off.bind(this, state)
  api.trigger = require('./lib/events').trigger.bind(this, state)

  var CustomStore = Store.defaults({ remoteBaseUrl: api.url + '/store/api' })
  var dbName = 'user/' + api.id
  api.store = new CustomStore(dbName)
  api.on('reset', function (opts) {
    opts.promise = opts.promise.then(api.store.clear)
  })

  api.account = new Account({ url: api.url + '/account/api' })
  api.on('reset', function (opts) {
    opts.promise = opts.promise.then(api.account.isSignedIn() ? api.account.signOut : null)
  })

  api.task = new Task('/hoodie/task/api')
  api.connectionStatus = new ConnectionStatus(api.url)
  api.log = new Log('hoodie')
  api.plugin = require('./lib/plugin')

  api.reset = require('./lib/reset').bind(api, state)

  return api
}
