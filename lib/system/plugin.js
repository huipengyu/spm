/*
 * Plugin System
 * @author: Hsiaoming Yang <lepture@me.com>
 *
 */

var fs = require('fs')
var os = require('os')
var path = require('path')
var async = require('async')
var logging = require('../terminal/logging')
var color = require('../terminal/color')
var pluginsPath = path.join(process.env['HOME'], '.spm', 'plugins')
var utils = require('../utils')
utils.safeWrite(pluginsPath)


exports.description = 'the plugin system for spm'

exports.add = function(name) {
  var data = getPlugins()
  if (data.enabled.indexOf(name) !== -1) {
    logging.warn('plugin %s has already installed, it is enabled', name)
    return name
  }

  if (data.disabled.indexOf(name) !== -1) {
    logging.warn('plugin %s has already installed, it is disabled', name)
    return name
  }
  data.enabled.push(name)

  updatePlugins(data)
  return name
}

exports.remove = function(name) {
  var data = getPlugins()
  var enabled = remove(data.enabled, name)
  if (enabled) {
    data.enabled = enabled
    updatePlugins(data)
    return data
  }
  var disabled = remove(data.disabled, name)
  if (disabled) {
    data.disabled = disabled
    updatePlugins(data)
    return data
  }
  logging.warn('plugin %s is not installed', name)
}

exports.enable = function(name) {
  var data = getPlugins()
  var disabled = remove(data.disabled, name)
  if (disabled) {
    data.disabled = disabled
    data.enabled.push(name)
    updatePlugins(data)
    return data
  }
  logging.warn('plugin %s is not disabled', name)
}

exports.disable = function(name) {
  var data = getPlugins()
  var enabled = remove(data.enabled, name)
  if (enabled) {
    data.enabled = enabled
    data.disabled.push(name)
    updatePlugins(data)
    return data
  }
  logging.warn('plugin %s is not enabled', name)
}

exports.show = function() {
  var data = getPlugins()
  if (data.enabled.length) {
    console.log(os.EOL + '  ' + color.green('Enabled plugins:') + os.EOL)
    data.enabled.forEach(function(name) {
      console.log('    ' + color.bold(name))
    })
    console.log()
  }
  if (data.disabled.length) {
    console.log(os.EOL + '  ' + color.blue('Disabled plugins:') + os.EOL)
    data.disabled.forEach(function(name) {
      console.log('    ' + color.gray(name))
    })
    console.log()
  }
}

var modules = []
Object.defineProperty(exports, 'modules', {
  get: function() {
    if (modules.length) return modules;

    var data = getPlugins()
    data.enabled.forEach(function(name) {
      try {
        var module = require(name)
        module.__plugin_name = name
        modules.push(module)
        logging.debug('loading plugin: %s', name)
      } catch (e) {
        logging.error("can't load plugin: %s", name)
        var cmd = 'spm remove ' + name
        logging.log('you can remove the plugin by %s', color.green(cmd))
      }
    })
    return modules
  }
})
Object.defineProperty(exports, 'plugins', {
  get: getPlugins
})


exports.waterfallCall = function(funcName, callback) {
  var queue = []
  exports.modules.forEach(function(plugin) {
    plugin[funcName] && queue.push(plugin[funcName])
  })
  async.waterfall(queue, function(err, results) {
    if (err) {
      logging.error(err)
    }
    callback(results)
  })
}

exports.seriesCall = function(funcName, callback) {
  var queue = {}
  exports.modules.forEach(function(plugin) {
    plugin[funcName] && queue[plugin.__plugin_name] = plugin[funcName]
  })
  async.series(queue, function(err, results) {
    if (err) {
      logging.error(err)
    }
    callback(results)
  })
}

exports.parallelCall = function(funcName, callback) {
  var queue = {}
  exports.modules.forEach(function(plugin) {
    plugin[funcName] && queue[plugin.__plugin_name] = plugin[funcName]
  })
  async.parallel(queue, function(err, results) {
    if (err) {
      logging.error(err)
    }
    callback(results)
  })
}

exports.blockCall = function(funcName) {
  exports.modules.forEach(function(plugin) {
    plugin[funcName] && plugin[funcName]()
  })
}

function remove(array, item) {
  var index = array.indexOf(item)
  if (index === -1) {
    return false
  }
  var before = array.slice(0, index)
  var after = array.slice(index + 1)
  var gallery = before.concat(after)
  return gallery
}

function getPlugins() {
  if (!fs.existsSync(pluginsPath)) return {enabled: [], disabled: []};

  var data = fs.readFileSync(pluginsPath, 'utf8')
  var lines = data.split(/\r\n|\r|\n/)

  var enabled = []
  var disabled = []
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i]
    if (!line) continue;

    if (line.slice(0, 1) === '#' && disabled.indexOf(line.slice(1) === -1)) {
      disabled.push(line.slice(1))
      continue;
    }
    if (enabled.indexOf(line) === -1) enabled.push(line);
  }
  return {disabled: disabled, enabled: enabled}
}

function updatePlugins(data) {
  var text = ''
  data.enabled.forEach(function(name) {
    text += name + os.EOL
  })

  data.disabled.forEach(function(name) {
    text += '#' + name + os.EOL
  })
  fs.writeFileSync(pluginsPath, text)
}
