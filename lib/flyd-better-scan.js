
var flyd = require('flyd')
var R = require('ramda')

module.exports = R.curryN(3, function(fn, acc, stream) {
  var newStream = flyd.stream(acc)
  flyd.map(function(val) {
    acc = fn(acc)
    newStream(acc)
  }, stream)
  return newStream
})
