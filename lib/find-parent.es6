import R from 'ramda'
// Find a the first parent node matching a class name
module.exports = R.curryN(2, (className, node) => {
  className = className.replace('.', '')
  while(node && !hasClass(node, className)) node = node.parentNode
  return node
})

const hasClass = (node, c) => node.className.indexOf(c) !== -1
