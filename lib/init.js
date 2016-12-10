module.exports = init

function init (hoodie) {
  // In order to prevent data loss, we want to move all data that has been
  // created without an account (e.g. while offline) to the user’s account
  // on signin. So before the signin happens, we store the user account’s id
  // and data and store it again after the signin
  hoodie.account.hook.before('signin', function (options) {
    options.beforeSignin = {
      accountId: hoodie.account.id
    }
    return hoodie.store.findAll().then(function (docs) {
      options.beforeSignin.docs = docs
    })
  })

  hoodie.account.hook.after('signin', function (session, options) {
    // when signing in to a newly created account, the account.id does not
    // change. The same is true when the user changed their username. In both
    // cases there is no need to migrate local data
    if (options.beforeSignin.accountId === hoodie.account.id) {
      return hoodie.store.connect()
    }

    return hoodie.store.reset({ name: 'user/' + hoodie.account.id })

    .then(function () {
      function migrate (doc) {
        doc.createdBy = hoodie.account.id
        delete doc._rev
        return doc
      }
      return hoodie.store.add(options.beforeSignin.docs.map(migrate))
    })

    .then(function () {
      return hoodie.store.connect()
    })
  })

  hoodie.account.hook.before('signout', function () {
    return hoodie.store.push()
    .catch(function (error) {
      if (error.status !== 401) {
        throw error
      }

      error.message = 'Local changes could not be synced, sign in first'
      throw error
    })
  })
  hoodie.account.hook.after('signout', function (options) {
    return hoodie.store.reset({ name: 'user/' + hoodie.account.id })
  })

  hoodie.account.on('unauthenticate', hoodie.store.disconnect)
  hoodie.account.on('reauthenticate', hoodie.store.connect)

  // handle connection status changes
  hoodie.connectionStatus.on('disconnect', function () {
    if (!hoodie.account.isSignedIn()) {
      return
    }
    hoodie.store.disconnect()
  })
  hoodie.connectionStatus.on('connect', function () {
    if (!hoodie.account.isSignedIn()) {
      return
    }
    hoodie.store.connect()
  })

  // hoodie.connectionStatus.ok is false if there is a connection issue
  if (hoodie.account.isSignedIn() && hoodie.connectionStatus.ok !== false) {
    hoodie.store.connect()
  }
}
