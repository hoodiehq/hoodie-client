module.exports = getState

var EventEmitter = require('events').EventEmitter

var defaultsDeep = require('lodash/defaultsDeep')

function getState (options) {
  options = options || {}

  if (typeof options.url !== 'string') {
    throw new TypeError('options.url is required (see https://github.com/hoodiehq/hoodie-client#constructor)')
  }
  if (typeof options.PouchDB !== 'function') {
    throw new TypeError('options.PouchDB is required (see https://github.com/hoodiehq/hoodie-client#constructor)')
  }

  var requiredProperties = {
    emitter: options && options.emitter || new EventEmitter()
  }

  return defaultsDeep(requiredProperties, options)
}
