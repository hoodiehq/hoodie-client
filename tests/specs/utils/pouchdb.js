module.exports = require('pouchdb-core')
  .plugin(require('pouchdb-replication'))
  .plugin(require('pouchdb-adapter-memory'))
  .plugin(require('pouchdb-adapter-http'))
