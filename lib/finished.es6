import h from 'snabbdom/h'
import R from 'ramda'
import flyd from 'flyd'
import flyd_scanMerge from 'flyd/module/scanmerge'
import flyd_flatMap from 'flyd/module/flatmap'
import flyd_filter from 'flyd/module/filter'
import flyd_lift from 'flyd/module/lift'
import moment from 'moment'

const init = (queue$) => {
  let state = {
    tasks: queue$().finished
  , remove$: flyd.stream()
  }

  let state$ = flyd.immediate(flyd_scanMerge([
    [state.remove$,      removeTask]
  , [queue$,             (state, queueState) => R.assoc('tasks', queueState.finished, state)]
  ], state))

  return state$
}


const removeTask = (state, taskName) =>
  console.log(state, taskName, 'state', 'taskName') || 
  R.assoc('tasks', R.filter(t => t.name !== taskName, state.tasks), state)


const view = state => {
  if(!state.tasks.length) return h('p', 'nothing finished yet.')

  return h('div.finished', [
    h('table.table-light.finishedTable', R.map(
      task => h('tr', [
        h('td', [task.name])
      , h('td', ['at ', moment(task.time).format("HH:mm")])
      , h('td', [h('a', {on: {click: [state.remove$, task.name]}, props: {innerHTML: '&times;'}})])
      ])
    , state.tasks
    ))
  ])
}

module.exports = {view, init}
