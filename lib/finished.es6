// npm
import h from 'snabbdom/h'
import R from 'ramda'
import flyd from 'flyd'
import flyd_scanMerge from 'flyd/module/scanmerge'
import flyd_flatMap from 'flyd/module/flatmap'
import flyd_filter from 'flyd/module/filter'
import flyd_lift from 'flyd/module/lift'
import flyd_mergeAll from 'flyd/module/mergeall'
import moment from 'moment'
import uuid from 'uuid'

// local
import submitForm from './submit-form.es6'
import prependTasks from './prepend-tasks.es6'
import persistLS from './persist-ls.es6'
import newTaskForm from './new-task-form.es6'

const init = events => {
  let defaultState = { tasks: persistLS.read('finished.tasks') || [] }

  events = R.merge({
    remove$: flyd.stream()
  , finishTask$: flyd.stream()
  , submit$: flyd.stream()
  }, events)

  flyd.map(s => console.log(s), events.finishTask$)

  let newFinishedTask$ = flyd.map(
    submitForm({points: p => Number(p), id: uuid.v1, time: Date.now, finishedAt: Date.now})
  , events.submit$)

  let saveToLS$ = flyd_mergeAll([events.remove$, events.finishTask$, newFinishedTask$])

  let updates = [
    [events.remove$,      removeTask]
  , [events.finishTask$,  finishTask]
  , [newFinishedTask$,    prependTasks]
  , [saveToLS$,           (_, state) => persistLS('finished.tasks', state.tasks) && state] 
  ]

  return {defaultState, events, updates}
}

const finishTask = (task, state) =>
  R.compose(
    tasks => R.assoc('tasks', tasks, state)
  , task => R.prepend(task, state.tasks)
  , R.assoc('finishedAt', Date.now())
  )(task)

const removeTask = (id, state) =>
  R.assoc('tasks', R.filter(t => t.id !== id, state.tasks), state)


const view = (events, state) => {
  let content = []
  if(!state.tasks.length) {
    content = [h('p.p2.mt2', 'Nothing finished yet.')]
  } else {
    let groups = R.groupBy(t => moment(t.finishedAt).startOf('day'), state.tasks)
    let groupVals = R.values(groups)
    let sums = R.map(R.compose(R.sum, R.map(R.prop('points'))), groupVals)
    let avg = Math.round(R.sum(sums) / groupVals.length)
    let trs = R.compose(
      R.flatten
    , R.values
    , R.mapObjIndexed(taskTableGroup(events.remove$))
    )(groups)
    content = [
      h('div.p2', ['Daily average: ', h('span.green.bold', avg + (avg === 1 ? ' point' : ' points'))])
    , h('table.table-light.finishedTable', trs)
    ]
  }

  return h('div.finished', [
    newTaskForm(events.submit$, 'Credit yourself for a finished task.')
  ].concat(content))
}


// A collection of task table rows grouped by day
const taskTableGroup = remove$ => (tasks, date) => {
  let sum = R.sum(R.map(R.prop('points'), tasks))
  return R.concat([
    h('tr', [
      h('td.py2', [h('strong.gray.h3', [moment(date).format('dddd YYYY-MM-DD')])])
    , h('td.py2', [h('span.green.bold', sum + (sum === 1 ? ' point' : ' points'))])
    , h('td')
    , h('td')
    , h('td')
    ]) ] // Show the day in bold in its own row
  , R.map(taskRow(remove$), tasks) // And then show each task
  )
}

const taskRow = remove$ => task => 
  h('tr', [
    h('td.py1.px2.align-middle.bold', [task.name])
  , h('td.py1.px2.align-middle', R.times(() => h('span.pointDot'), task.points))
  , h('td.py1.px2.align-middle.gray', ['finished at ', moment(task.finishedAt).format("HH:mm")])
  , task.duration
    ? h('td.py1.px2.align-middle.gray', ['focused for ', moment.duration(task.duration, 'seconds').format('mm:ss', {trim: false})])
    : h('td.py1.px2.align-middle')
  , h('td.py1.px2.align-middle', [h('a.btn.red', {on: {click: [remove$, task.id]}}, [h('span.icon-blocked')])])
  ])

module.exports = {view, init}
