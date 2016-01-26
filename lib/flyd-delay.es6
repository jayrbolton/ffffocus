import flyd from 'flyd'

module.exports = ms => {
  let $ = flyd.stream()
  setTimeout(t => $(t), ms)
  return $
}
