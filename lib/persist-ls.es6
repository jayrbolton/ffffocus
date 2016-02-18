
let persist = (key, obj) => {
  localStorage.setItem(key, JSON.stringify(obj))
  return true
}

persist.read = (key) => {
  let str = localStorage.getItem(key)
  if(!str) return str
  return JSON.parse(str)
}

module.exports = persist
