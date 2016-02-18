import R from 'ramda'
import filterMatch from './filter-match.es6'

module.exports = (t, state) => {
  let tasks = R.prepend(t, state.tasks)

  if(filterMatch(state.currentSearch, t.name)) {
    return R.assoc('tasks', tasks, state)
  } else {
    tasks = R.map(R.assoc('hidden', false), tasks)
    return R.merge(state, {tasks: tasks, currentSearch: ''})
  }
}

