module.exports = function pluginMethod (hoodie, options, plugin) {
  if (typeof plugin === 'function') {
    plugin(hoodie, options)
  }

  if (typeof plugin === 'object') {
    Object.keys(plugin).forEach(function (key) {
      hoodie[key] = plugin[key]
    })
  }

  return hoodie
}
