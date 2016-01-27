import flyd from 'flyd'

module.exports = (fn, acc, stream$) => {
  let scanned$ = flyd.stream()
  flyd.map(x => {
    acc = fn(acc, x)
    scanned$(acc)
  }, stream$)
  return scanned$
}

