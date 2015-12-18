module.exports = reset

var unsetId = require('./id').unset

function reset (state) {
  var promise = Promise.resolve()

  this.trigger('reset', {promise: promise})

  return promise.then(function () {
    unsetId(state)
  })
}
