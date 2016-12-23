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

  var hoodieStore
  var isReady = false
  var api = {
    get url () {
      return state.url + '/hoodie'
    },
    get ready () {
      return Promise.all([hoodieAccount.ready, hoodieConnectionStatus.ready])

      .then(function () {
        isReady = true
        var CustomPouchDB = state.PouchDB.defaults({
          ajax: {
            headers: {
              get authorization () {
                var session = api.account.get('session')
                if (!session) {
                  return
                }

                return 'Session ' + session.id
              }
            }
          }
        })
        var CustomStore = internals.Store.defaults({
          PouchDB: CustomPouchDB,
          remoteBaseUrl: url + '/store/api'
        })
        var dbName = 'user/' + hoodieAccount.id
        hoodieStore = new CustomStore(dbName)

        internals.init(api)

        return api
      })
    },

    // core modules
    get account () {
      if (!isReady) {
        throw new Error('hoodie.account not yet accessible, wait for hoodie.ready to resolve')
      }

      return hoodieAccount
    },
    get store () {
      if (!isReady) {
        throw new Error('hoodie.store not yet accessible, wait for hoodie.ready to resolve')
      }

      return hoodieStore
    },
    get connectionStatus () {
      if (!isReady) {
        throw new Error('hoodie.connectionStatus not yet accessible, wait for hoodie.ready to resolve')
      }

      return hoodieConnectionStatus
    },

    // helpers
    request: require('./request').bind(this, state),
    log: log,
    plugin: require('./plugin'),

    // events
    on: require('./events').on.bind(this, state),
    one: require('./events').one.bind(this, state),
    off: require('./events').off.bind(this, state),
    trigger: require('./events').trigger.bind(this, state)
  }

  return api
}

function mergeOptionsAndCreate (objectConstructor, defaultOptions, stateOptions) {
  var options = defaultsDeep(defaultOptions, stateOptions || {})
  return objectConstructor(options)
}
