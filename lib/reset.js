module.exports = reset

var unsetId = require('./id').unset

function reset (state) {
  var hooks = [unsetId(state)]

  this.trigger('reset', {hooks: hooks})

  return Promise.all(hooks)
}
