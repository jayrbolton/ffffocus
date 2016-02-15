// npm
import h from 'snabbdom/h'
import R from 'ramda'
import flyd from 'flyd'
import flyd_scanMerge from 'flyd/module/scanmerge'
import flyd_flatMap from 'flyd/module/flatmap'
import flyd_filter from 'flyd/module/filter'
import flyd_mergeAll from 'flyd/module/mergeall'
import {dropRepeats} from 'flyd/module/droprepeats'
import moment from 'moment'

// local
import getFormData from './get-form-data.es6'
import prependTasks from './prepend-tasks.es6'

const init = events => {
  events = R.merge({
    remove$: flyd.stream()
  , submit$: flyd.stream()
  , startFocus$: flyd.stream()
  , finishTask$: flyd.stream()
  , dragstart$: flyd.stream()
  , dragend$: flyd.stream()
  , dragover$: flyd.stream()
  }, events)

  let defaultState = { tasks: [] } // queued unfinished tasks

  // Load task data from localStorage
  let json = localStorage.getItem('queue.tasks')
  if(json) {
    defaultState.tasks = JSON.parse(json)
  }

  let newTask$ = R.compose(
    flyd.map(name => ({name: name, time: Date.now()}))
  , flyd.map(getFormData)
  )(events.submit$)

  // dragstart
  let dragging$ = flyd.map(
    ev => {
      ev.dataTransfer.effectAllowed = 'move'
      ev.dataTransfer.dropEffect = 'move'
      ev.dataTransfer.setData('text/html', ev.currentTarget.innerHTML)
      return Number(ev.currentTarget.getAttribute('data-timestamp'))
    }
  , events.dragstart$)

  let rowOver$ = R.compose(
    flyd_filter(t => t !== null)
  , dropRepeats
  , flyd.map(ev => Number(ev.target.parentNode.getAttribute('data-timestamp')))
  )(events.dragover$)

  let saveToLS$ = flyd_mergeAll([newTask$, events.remove$, events.finishTask$, events.dragend$])

  let updates = [
    [newTask$,            prependTasks]
  , [events.remove$,      (name, state) => R.assoc('tasks', R.filter(task => task.name !== name, state.tasks), state)]
  , [events.finishTask$,  finishTask]
  , [rowOver$,            R.assoc('rowOver')]
  , [dragging$,           R.assoc('currentlyDragging')]
  , [events.dragend$,     dropTask]
  , [saveToLS$,           persistLS]
  ]

  return {events, defaultState, updates}
}


const dropTask = (_, state) => {
  let removeIdx = R.findIndex(
    R.compose(R.equals(state.currentlyDragging), R.prop('time'))
  , state.tasks)
  let insertIdx = R.findIndex(
    R.compose(R.equals(state.rowOver), R.prop('time'))
  , state.tasks)
  let tasks = R.compose(
    R.insert(insertIdx, state.tasks[removeIdx])
  , R.remove(removeIdx, 1)
  )(state.tasks)
  return R.compose(
    R.assoc('rowOver', undefined)
  , R.assoc('currentlyDragging', undefined)
  , R.assoc('tasks', tasks)
  )(state)
}


const persistLS = (_, state) => {
  localStorage.setItem('queue.tasks', JSON.stringify(state.tasks))
  return state
}



const finishTask = (pair, state) => {
  let [task, _] = pair
  return R.assoc('tasks', R.filter(t => t.name !== task.name && t.time !== task.time, state.tasks), state)
}

const view = (events, state) => {
  return h('div.queue', [
    h('form.newTask.p2', {
      on: {submit: events.submit$}
    }, [
      h('input.bold.field.col-6', {props: {type: 'text', placeholder: 'Enter a new task.'}})
    ])
  , h('hr')
  , table(events, state)
  ])
}

const table = (events, state) => {
  if(!state.tasks.length) return h('p.cleanSlate.mt2.p2.green.bold', 'Your slate is clean.')

  return h('table.table-light.mt2', [
    h('thead', [
      h('tr', [
        h('th.px2.py1.align-middle', [h('input.field.col-12', {props: {type: 'text', placeholder: 'Filter by name'}})])
      , h('th.px2.py1.align-middle.gray', state.tasks.length + ' total tasks')
      , h('th.px2.py1.align-middle')
      , h('th.px2.py1.align-middle')
      , h('th.px2.py1.align-middle')
      ])
    ])
  , h('tbody', {
      on: {dragover: events.dragover$}
    }, rows(events, state))
  ])
}

const rows = (events, state) => {
    return R.map(
      task =>
        h('tr', {
          props: { draggable: true}
        , class: { isOver: state.rowOver === task.time, isDragging: state.currentlyDragging === task.time }
        , attrs: {'data-timestamp': task.time}
        , on: {
            dragend: events.dragend$
          , dragstart: events.dragstart$
          }
        }, [
          h('td.px2.py1.align-middle', [h('strong', task.name)])
        , h('td.px2.py1.align-middle.gray', 'added ' + moment(task.time).fromNow())
        , h('td.px2.py1.align-middle', [h('a.btn.green', {on: {click: [events.finishTask$, [task, 0]]}}, [h('span.icon-checkmark'), ' '])])
        , h('td.px2.py1.align-middle', [h('a.btn.outline.blue',  {on: {click: [events.startFocus$, task]}}, 'Focus')])
        , h('td.px2.py1.align-middle', [h('a.btn.red.icon-blocked', {on: {click: [events.remove$, task.name]}})])
        ])
    , state.tasks
    )
}

module.exports = {view, init}


