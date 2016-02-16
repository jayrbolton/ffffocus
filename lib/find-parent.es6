// Find a the first parent node matching a class name
module.exports = (node, tagName) => {
  tagName = tagName.toUpperCase()
  while(node.parentNode.tagName !== tagName) node = node.parentNode
  return node.parentNode
}
