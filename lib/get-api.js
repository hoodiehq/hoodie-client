module.exports = getApi

var defaultsDeep = require('lodash/defaultsDeep')

var internals = module.exports.internals = {}
internals.Store = require('@hoodie/store-client')
internals.Account = require('@hoodie/account-client')
internals.ConnectionStatus = require('@hoodie/connection-status/client')
internals.Log = require('@hoodie/log/client')
internals.pouchdbDocApi = require('pouchdb-doc-api')

internals.init = require('./init')

function getApi (state) {
  var url = state.url + '/hoodie'

  state.PouchDB.plugin(internals.pouchdbDocApi)
  var hoodieDb = new state.PouchDB('hoodie')

  var hoodieAccount = mergeOptionsAndCreate(internals.Account, {
    cache: hoodieDb.doc('_local/account'),
    url: url + '/account/api'
  }, state.account)

  var hoodieConnectionStatus = mergeOptionsAndCreate(internals.ConnectionStatus, {
    cache: hoodieDb.doc('_local/connection-status'),
    url: url
  }, state.connectionStatus)
  var log = mergeOptionsAndCreate(internals.Log, { prefix: 'hoodie' }, state.log)

  var hoodieStore = new internals.Store('store', {
    PouchDB: state.PouchDB,
    get remote () {
      return hoodieAccount.get(['id', 'session.id']).then(function (properties) {
        return new state.PouchDB(url + '/store/api/' + encodeURIComponent('user/' + properties.id), {
          ajax: {
            headers: {
              authorization: 'Session ' + properties.session.id
            }
          }
        })
      })
    }
  })

  var api = {
    get url () {
      return state.url + '/hoodie'
    },

    // core modules
    account: hoodieAccount,
    store: hoodieStore,
    connectionStatus: hoodieConnectionStatus,

    // helpers
    request: require('./request').bind(this, state),
    log: log,

    // events
    on: require('./events').on.bind(this, state),
    one: require('./events').one.bind(this, state),
    off: require('./events').off.bind(this, state),
    trigger: require('./events').trigger.bind(this, state)
  }

  api.plugin = require('./plugin').bind(null, api, state)

  internals.init(api)

  return api
}

function mergeOptionsAndCreate (ObjectConstructor, defaultOptions, stateOptions) {
  var options = defaultsDeep(defaultOptions, stateOptions || {})
  return new ObjectConstructor(options)
}
