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

// local
import getFormData from './get-form-data.es6'
import prependTasks from './prepend-tasks.es6'

const init = events => {
  let defaultState = { tasks: [] }
  let json = localStorage.getItem('finished.tasks')
  if(json) defaultState.tasks = JSON.parse(json)
  events = R.merge({
    remove$: flyd.stream()
  , finishTask$: flyd.stream()
  , submit$: flyd.stream()
  }, events)

  flyd.map(s => console.log(s), events.finishTask$)


  let newFinishedTask$ = R.compose(
    flyd.map(name => ({name: name, finishedAt: Date.now(), time: Date.now()}))
  , flyd.map(getFormData)
  )(events.submit$)

  let saveToLS$ = flyd_mergeAll([events.remove$, events.finishTask$, newFinishedTask$])

  let updates = [
    [events.remove$,      removeTask]
  , [events.finishTask$,  finishTask]
  , [newFinishedTask$,    prependTasks]
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
  task = R.assoc('finishedAt', Date.now(), task)
  return R.assoc('tasks', R.prepend(task, state.tasks), state)
}

const removeTask = (time, state) =>
  R.assoc('tasks', R.filter(t => t.time !== time, state.tasks), state)


const view = (events, state) => {
  let content
  if(!state.tasks.length) {
    content = h('p.p2.mt2', 'Nothing finished yet.')
  } else {
    let trs = R.compose(
      R.flatten
    , R.values
    , R.mapObjIndexed(taskTableGroup(events.remove$))
    , R.groupBy(task => moment(task.finishedAt).startOf('day'))
    )(state.tasks)
    content = h('table.table-light.finishedTable', trs)
  }

  return h('div.finished', [
    h('form.newTask.p2', { on: {submit: events.submit$} }, [
      h('label.col-2.inline-block.bold.navy', 'Add task:')
    , ' '
    , h('input.field.col-6', {props: {type: 'text', placeholder: 'Credit yourself for a finished task.'}})
    ])
  , content
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
  , h('td.py1.px2.align-middle', ['finished at ', moment(task.finishedAt).format("HH:mm")])
  , task.duration
    ? h('td.py1.px2.align-middle', ['focused for ', moment.duration(task.duration, 'seconds').format('mm:ss', {trim: false})])
    : h('td.py1.px2.align-middle', '')
  , h('td.py1.px2.align-middle', [h('a.btn.red', {on: {click: [remove$, task.time]}}, [h('span.icon-blocked')])])
  ])

module.exports = {view, init}
