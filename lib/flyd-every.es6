import {stream} from 'flyd'

module.exports = ms => {
  let $ = stream()
  setInterval(t => $(t), ms)
  return $
}
