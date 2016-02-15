
module.exports = ev => {
  ev.preventDefault()
  let val = ev.currentTarget.querySelector('input').value
  ev.target.reset()
  return val
}
