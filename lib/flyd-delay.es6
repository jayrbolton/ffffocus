import flyd from 'flyd'

// Start emitting values from the stream after an ms delay

module.exports = flyd.curryN(2, (ms, stream) => {
  let newStream = flyd.stream()
  setTimeout(t => flyd.map(newStream, stream), ms)
  return newStream
})
