import h from 'snabbdom/h'
import R from 'ramda'
import flyd from 'flyd'
import flyd_scanMerge from 'flyd/module/scanmerge'
import flyd_flatMap from 'flyd/module/flatmap'
import flyd_filter from 'flyd/module/filter'
import flyd_lift from 'flyd/module/lift'
import flyd_mergeAll from 'flyd/module/mergeall'
import moment from 'moment'

const init = events => {
  let defaultState = { tasks: [] }
  let json = localStorage.getItem('finished.tasks')
  if(json) defaultState.tasks = JSON.parse(json)
  events = R.merge({
    remove$: flyd.stream()
  , finishTask$: flyd.stream()
  }, events)

  flyd.map(s => console.log(s), events.finishTask$)

  let saveToLS$ = flyd_mergeAll([events.remove$, events.finishTask$])

  let updates = [
    [events.remove$,      removeTask]
  , [events.finishTask$,  finishTask]
  , [saveToLS$,           persistLS] 
  ]

  return {defaultState, events, updates}
}

const persistLS = (_, state) => {
  localStorage.setItem('finished.tasks', JSON.stringify(state.tasks))
  return state
}

const finishTask = (pair, state) => {
  let [task, duration] = pair
  task = R.assoc('duration', duration, task)
  return R.assoc('tasks', R.prepend(task, state.tasks), state)
}

const removeTask = (name, state) =>
  R.assoc('tasks', R.filter(t => t.name !== name, state.tasks), state)


const view = (events, state) => {
  if(!state.tasks.length) return h('p.p2.mt2', 'Nothing finished yet.')

  let trs = R.compose(
    R.flatten
  , R.values
  , R.mapObjIndexed(taskTableGroup(events.remove$))
  , R.groupBy(task => moment(task.time).startOf('day'))
  )(state.tasks)

  return h('div.finished.mt2', [
    h('table.table-light.finishedTable', trs)
  ])
}


// A collection of task table rows grouped by day
const taskTableGroup = remove$ => (tasks, date) =>
  R.concat(
    [ h('tr', [h('td', [h('strong.gray', [moment(date).format('dddd')])]), h('td'), h('td'), h('td')]) ] // Show the day in bold in its own row
  , R.map(taskRow(remove$), tasks) // And then show each task
  )

const taskRow = remove$ => task => 
  h('tr', [
    h('td.py1.px2.align-middle.bold', [task.name])
  , h('td.py1.px2.align-middle', ['finished at ', moment(task.time).format("HH:mm")])
  , task.duration
    ? h('td.py1.px2.align-middle', ['focused for ', moment.duration(task.duration, 'seconds').format('mm:ss', {trim: false})])
    : h('td.py1.px2.align-middle', '')
  , h('td.py1.px2.align-middle', [h('a.btn.red', {on: {click: [remove$, task.name]}, props: {innerHTML: '&times;'}})])
  ])

module.exports = {view, init}
