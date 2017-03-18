var simple = require('simple-mock')
var test = require('tape')

var init = require('../../lib/init')
var getApi = require('../../lib/get-api')
var getState = require('../../lib/get-state')

test('"reset" triggered on "signin"', function (t) {
  t.plan(7)

  var signInTestOrder = []
  var existingObjects = [{id: 'foo', createdBy: 'accountid1'}]
  var hoodie = {
    account: {
      on: simple.stub(),
      hook: {
        before: simple.stub(),
        after: simple.stub()
      },
      get: simple.stub().callFn(function (path) {
        return Promise.resolve(path === 'id' ? 'user123' : undefined)
      })
    },
    store: {
      findAll: function () {
        return Promise.resolve(existingObjects)
      },
      add: function (objects) {
        t.deepEqual(objects, existingObjects, 'adding existing objects after sign in')
        return Promise.resolve(existingObjects)
      },
      connect: function () {
        t.pass('store.connect is called after signin')
        signInTestOrder.push('connect')
      },
      reset: function (options) {
        t.is(options, undefined, 'store.reset called without options')
        t.pass('store.reset called after signin')
        signInTestOrder.push('reset')

        return Promise.resolve()
      }
    },
    connectionStatus: {
      on: simple.stub()
    }
  }

  init(hoodie)

  var beforeSignInCall = hoodie.account.hook.before.calls[0]
  var afterSignInCall = hoodie.account.hook.after.calls[0]

  t.is(beforeSignInCall.args[0], 'signin', 'before signin hook registered')
  t.is(afterSignInCall.args[0], 'signin', 'after signin hook registered')
  var options = {}
  beforeSignInCall.args[1](options)

  .then(function () {
    options.beforeSignin.accountId = 'accountid2'
    return afterSignInCall.args[1]({}, options)
  })
  .then(function () {
    t.deepEqual(signInTestOrder, ['reset', 'connect'], 'store.con0nect was called after store.reset')
  })
})

test('"reset" triggered after signout', function (t) {
  t.plan(3)

  var hoodie = {
    account: {
      on: simple.stub(),
      hook: {
        before: simple.stub(),
        after: simple.stub()
      },
      get: simple.stub().resolveWith()
    },
    store: {
      reset: function (options) {
        t.is(options, undefined, 'store.reset called without options')
        t.pass('store.reset called on "signout"')
      }
    },
    connectionStatus: {
      on: simple.stub()
    }
  }

  init(hoodie)

  var afterHooks = hoodie.account.hook.after.calls
  t.is(afterHooks[1].args[0], 'signout', 'after signout hook registered')
  console.log(afterHooks[1].args[0])
  afterHooks[1].args[1]()
})

test('"hoodie.store.connect()" is called when hoodie.account.get("sesion") resolves with nothing', function (t) {
  t.plan(1)

  var session = {}
  var hoodie = {
    account: {
      on: simple.stub(),
      hook: {
        before: simple.stub(),
        after: simple.stub()
      },
      get: simple.stub().returnWith({
        then: function (callback) {
          callback(session)
        }
      })
    },
    store: {
      connect: simple.stub(),
      reset: simple.stub()
    },
    connectionStatus: {
      on: simple.stub()
    }
  }

  init(hoodie)
  t.is(hoodie.store.connect.callCount, 1, 'calls hoodie account.connect once')
})

test('"hoodie.store.connect()" is *not* called when hoodie.account.get("session") resolves with undefined', function (t) {
  t.plan(1)

  var hoodie = {
    account: {
      on: simple.stub(),
      hook: {
        before: simple.stub(),
        after: simple.stub()
      },
      get: simple.stub().resolveWith()
    },
    store: {
      connect: simple.stub(),
      reset: simple.stub()
    },
    connectionStatus: {
      on: simple.stub()
    }
  }

  init(hoodie)
  t.is(hoodie.store.connect.callCount, 0, 'does not hoodie account.connect')
})

test('hoodie.store gets initialized with options.PouchDB', function (t) {
  t.plan(1)

  simple.mock(getApi.internals, 'Account', function () {
    return {
      on: simple.stub(),
      hook: {
        before: simple.stub(),
        after: simple.stub()
      },
      get: simple.stub().resolveWith()
    }
  })
  var CustomStoreMock = simple.stub().returnWith({
    connect: simple.stub()
  })
  simple.mock(getApi.internals, 'Store', CustomStoreMock)
  simple.mock(getApi.internals.Store, 'defaults').returnWith(CustomStoreMock)

  var PouchDB = simple.stub().returnWith({
    doc: simple.stub().returnWith({
      get: simple.stub().resolveWith({}),
      set: simple.stub().resolveWith({}),
      unset: simple.stub().resolveWith({})
    })
  })
  simple.mock(PouchDB, 'defaults').returnWith(PouchDB)
  simple.mock(PouchDB, 'plugin').returnWith(PouchDB)

  var state = getState({
    PouchDB: PouchDB,
    url: 'http://localhost:1234/hoodie'
  })
  getApi(state)
  var storeOptions = getApi.internals.Store.lastCall.args[1]
  t.is(storeOptions.PouchDB, PouchDB, 'sets options.PouchDB')
})

test('"hoodie.store.push" is called before signout', function (t) {
  t.plan(2)

  var hoodie = {
    account: {
      on: simple.stub(),
      hook: {
        before: simple.stub(),
        after: simple.stub()
      },
      get: simple.stub().resolveWith()
    },
    store: {
      push: function () {
        t.pass('store.push called on "signout"')
        return {catch: function () {}}
      }
    },
    connectionStatus: {
      on: simple.stub()
    }
  }

  init(hoodie)

  var beforeHooks = hoodie.account.hook.before.calls
  t.is(beforeHooks[1].args[0], 'signout', 'before signout hook registered')
  beforeHooks[1].args[1]()
})

test('"hoodie.store.push" returns better error message if local changes cannot be synced', function (t) {
  t.plan(2)

  var UnauthorizedError = new Error('unauthorized')
  UnauthorizedError.status = 401

  var hoodie = {
    account: {
      on: simple.stub(),
      hook: {
        before: simple.stub(),
        after: simple.stub()
      },
      get: simple.stub().resolveWith()
    },
    store: {
      push: simple.stub().rejectWith(UnauthorizedError)
    },
    connectionStatus: {
      on: simple.stub()
    }
  }

  init(hoodie)

  var beforeHooks = hoodie.account.hook.before.calls
  t.is(beforeHooks[1].args[0], 'signout', 'before signout hook registered')
  beforeHooks[1].args[1]()
    .catch(function (error) {
      t.is(error.message, 'Local changes could not be synced, sign in first')
    })
})

test('"hoodie.store.*" is *not* called when hoodie.account.get("session") resolves with nothing', function (t) {
  t.plan(2)

  var hoodie = {
    account: {
      on: simple.stub(),
      hook: {
        before: simple.stub(),
        after: simple.stub()
      },
      get: simple.stub().resolveWith()
    },
    store: {
      disconnect: simple.stub(),
      connect: simple.stub()
    },
    connectionStatus: {
      on: function (name, listener) {
        listener()
      }
    }
  }

  init(hoodie)
  t.is(hoodie.store.disconnect.callCount, 0, 'calls hoodie store.disconnect zero')
  t.is(hoodie.store.connect.callCount, 0, 'calls hoodie store.connect zero')
})

test('"hoodie.store.*" is called on "disconnect" and "connect"', function (t) {
  t.plan(2)

  var session = {id: 'sessionid123'}
  var hoodie = {
    account: {
      on: simple.stub(),
      hook: {
        before: simple.stub(),
        after: simple.stub()
      },
      get: simple.stub().resolveWith(session)
    },
    store: {
      disconnect: function (options) {
        t.pass('store.disconnect called on "disconnect"')
      },
      connect: function (options) {
        t.pass('store.connect called on "connect"')
      }
    },
    connectionStatus: {
      on: function (name, listener) {
        listener()
      },
      ok: false // else connect is called a second time
    }
  }

  init(hoodie)
})

test('options.account passed into Account constructor', function (t) {
  t.plan(2)

  var cacheApi = {
    get: simple.stub().resolveWith({}),
    set: simple.stub().resolveWith({}),
    unset: simple.stub().resolveWith({})
  }
  var state = {
    url: 'http://example.com',
    account: {
      id: 123
    },
    PouchDB: simple.stub().returnWith({
      doc: simple.stub().returnWith(cacheApi)
    })
  }
  simple.mock(state.PouchDB, 'defaults').returnWith(state.PouchDB)
  simple.mock(state.PouchDB, 'plugin').returnWith(state.PouchDB)
  simple.mock(getApi.internals, 'Account').returnWith(state.account)
  simple.mock(getApi.internals, 'Store').returnWith(simple.stub())
  simple.mock(getApi.internals, 'init').returnWith()

  getApi(state)

  var expectedAccountArgs = {
    id: 123,
    url: 'http://example.com/hoodie/account/api',
    cache: cacheApi
  }
  t.is(getApi.internals.Account.callCount, 1, 'Account constructor called')
  t.deepEqual(
    getApi.internals.Account.lastCall.args[0],
    expectedAccountArgs,
    'Account options passed into constructor'
  )

  simple.restore()
})

test('options.ConnectionStatus passed into ConnectionStatus constructor', function (t) {
  t.plan(2)

  var cacheApi = {
    get: simple.stub().resolveWith({}),
    set: simple.stub().resolveWith({}),
    unset: simple.stub().resolveWith({})
  }
  var PouchDB = simple.stub().returnWith({
    doc: simple.stub().returnWith(cacheApi)
  })
  PouchDB.defaults = simple.stub().returnWith(PouchDB)
  var state = {
    url: 'http://example.com',
    account: {
      id: 123
    },
    connectionStatus: {
      interval: 10
    },
    PouchDB: PouchDB
  }
  simple.mock(state.PouchDB, 'defaults').returnWith(state.PouchDB)
  simple.mock(state.PouchDB, 'plugin').returnWith(state.PouchDB)
  simple.mock(getApi.internals, 'Account').returnWith(state.account)
  simple.mock(getApi.internals, 'Store').returnWith(simple.stub())
  simple.mock(getApi.internals, 'ConnectionStatus').returnWith(simple.stub())
  simple.mock(getApi.internals, 'init').returnWith()

  getApi(state)

  var expectedConnectionStatusArgs = {
    cache: cacheApi,
    interval: 10,
    url: 'http://example.com/hoodie'
  }
  t.is(getApi.internals.ConnectionStatus.callCount, 1, 'ConnectionStatus constructor called')
  t.deepEqual(
    getApi.internals.ConnectionStatus.lastCall.args[0],
    expectedConnectionStatusArgs,
    'ConnectionStatus options passed into constructor'
  )
})

test('options.Log passed into Log constructor', function (t) {
  t.plan(2)

  var cacheApi = {
    get: simple.stub().resolveWith({}),
    set: simple.stub().resolveWith({}),
    unset: simple.stub().resolveWith({})
  }
  var PouchDB = simple.stub().returnWith({
    doc: simple.stub().returnWith(cacheApi)
  })
  var state = {
    url: 'http://example.com',
    account: {
      id: 123
    },
    log: {
      styles: false
    },
    PouchDB: PouchDB
  }
  simple.mock(state.PouchDB, 'defaults').returnWith(state.PouchDB)
  simple.mock(state.PouchDB, 'plugin').returnWith(state.PouchDB)
  simple.mock(getApi.internals, 'Account').returnWith(state.account)
  simple.mock(getApi.internals, 'Store').returnWith(simple.stub())
  simple.mock(getApi.internals, 'Log').returnWith(simple.stub())
  simple.mock(getApi.internals, 'init').returnWith()

  getApi(state)

  var expectedLogArgs = {
    styles: false,
    prefix: 'hoodie'
  }
  t.is(getApi.internals.Log.callCount, 1, 'Log constructor called')
  t.deepEqual(getApi.internals.Log.lastCall.args[0], expectedLogArgs, 'Log options passed into constructor')
})

test('hoodie store returns a PouchDB instance', function (t) {
  t.plan(1)

  var cacheApi = {
    get: simple.stub().resolveWith({}),
    set: simple.stub().resolveWith({}),
    unset: simple.stub().resolveWith({})
  }
  var pouchDBInstance = {
    doc: simple.stub().returnWith(cacheApi)
  }
  var PouchDB = simple.stub().returnWith(pouchDBInstance)
  var properties = {id: 1234, session: {id: 1234}}
  var state = {
    url: 'http://example.com',
    account: {
      get: simple.stub().resolveWith(properties),
      id: 123
    },
    session: {
      id: 123
    },
    log: {
      styles: false
    },
    PouchDB: PouchDB
  }

  simple.mock(state.PouchDB, 'defaults').returnWith(state.PouchDB)
  simple.mock(state.PouchDB, 'plugin').returnWith(state.PouchDB)
  simple.mock(getApi.internals, 'Account').returnWith(state.account)
  simple.mock(getApi.internals, 'Store').returnWith(simple.stub())
  simple.mock(getApi.internals, 'Log').returnWith(simple.stub())
  simple.mock(getApi.internals, 'init').returnWith()

  getApi(state)
  getApi.internals.Store.lastCall.args[1].remote.then(function (s) {
    t.deepEqual(s, pouchDBInstance, 'hoodie store returns a PouchDB instance')
  })
})

test('hoodie.store.connect() is called', function (t) {
  t.plan(4)

  var hoodie = {
    account: {
      on: simple.stub(),
      hook: {
        before: simple.stub(),
        after: simple.stub()
      },
      get: simple.stub().callFn(function (path) {
        return Promise.resolve('hoodie')
      }),
      id: 'hoodie'
    },
    store: {
      findAll: function () {
        return Promise.resolve('hoodie')
      },

      connect: function () {
        t.pass('store.connect is called after signin')
      }

    },
    connectionStatus: {
      on: simple.stub()
    }
  }

  init(hoodie)

  var beforeSignInCall = hoodie.account.hook.before.calls[0]
  var afterSignInCall = hoodie.account.hook.after.calls[0]

  t.is(beforeSignInCall.args[0], 'signin', 'before signin hook registered')
  t.is(afterSignInCall.args[0], 'signin', 'after signin hook registered')
  var options = {}
  beforeSignInCall.args[1](options)

  .then(function () {
    return afterSignInCall.args[1](hoodie.account, options)
  })
})
test('hoodie.account.hook.before returns an error', function (t) {
  t.plan(2)

  var UnauthorizedError = new Error('unauthorized')
  UnauthorizedError.status = 123

  var hoodie = {
    account: {
      on: simple.stub(),
      hook: {
        before: simple.stub(),
        after: simple.stub()
      },
      get: simple.stub().resolveWith()
    },
    store: {
      push: simple.stub().rejectWith(UnauthorizedError)
    },
    connectionStatus: {
      on: simple.stub()
    }
  }

  init(hoodie)

  var beforeHooks = hoodie.account.hook.before.calls
  console.log(beforeHooks[1].args[1])
  t.is(beforeHooks[1].args[0], 'signout', 'before signout hook registered')
  beforeHooks[1].args[1]()
    .catch(function (error) {
      t.is(error, UnauthorizedError, 'returns an error if error code is not 401')
    })
})

test('signed in,but invalid session', function (t) {
  t.plan(1)

  var hoodie = {
    account: {
      on: simple.stub(),
      hook: {
        before: simple.stub(),
        after: simple.stub()
      },
      get: simple.stub().resolveWith({invalid: true})
    },
    store: {
      connect: simple.stub(),
      reset: simple.stub()
    },
    connectionStatus: {
      on: simple.stub()
    }
  }

  init(hoodie)
  t.is(hoodie.store.connect.callCount, 0, 'invalid session created and checked')
})
