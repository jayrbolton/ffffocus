
import R from 'ramda'

module.exports = (searchTerm, taskName) =>
  !searchTerm || !searchTerm.length || taskName.match(new RegExp('.*' + searchTerm.split(' ').join('.*') + '.*', 'i'))
