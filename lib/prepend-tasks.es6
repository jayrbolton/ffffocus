import R from 'ramda'

module.exports = (t, state) => R.assoc('tasks', R.prepend(t, state.tasks), state)

