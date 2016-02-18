// npm
import h from 'snabbdom/h'
import R from 'ramda'
import flyd from 'flyd'
import flyd_scanMerge from 'flyd/module/scanmerge'
import flyd_flatMap from 'flyd/module/flatmap'
import flyd_filter from 'flyd/module/filter'
import flyd_mergeAll from 'flyd/module/mergeall'
import flyd_afterSilence from 'flyd/module/aftersilence'
import {dropRepeats} from 'flyd/module/droprepeats'
import moment from 'moment'
import uuid from 'uuid'

// local
import prependTasks from './prepend-tasks.es6'
import filterMatch from './filter-match.es6'
import findParent from './find-parent.es6'
import persistLS from './persist-ls.es6'
import submitForm from './submit-form.es6'
import newTaskForm from './new-task-form.es6'

const init = events => {
  events = R.merge({
    remove$: flyd.stream()
  , submit$: flyd.stream()
  , startFocus$: flyd.stream()
  , finishTask$: flyd.stream()
  , dragstart$: flyd.stream()
  , dragend$: flyd.stream()
  , dragover$: flyd.stream()
  , filter$: flyd.stream()
  , editTask$: flyd.stream()
  , addSubtask$: flyd.stream()
  , filterPoints$: flyd.stream()
  }, events)

  let defaultState = {
    // Set the default task state from localStorage. Remove any 'hidden' markers on tasks from previous searches.
    tasks: R.map(R.assoc('hidden', false), persistLS.read('queue.tasks') || [])
  }

  let newTask$ = flyd.map(
    submitForm({time: Date.now, duration: s => s || 0, points: p => Number(p), id: uuid.v1})
  , events.submit$)

  // dragstart
  let dragging$ = flyd.map(
    ev => {
      ev.dataTransfer.effectAllowed = 'move'
      ev.dataTransfer.dropEffect = 'move'
      ev.dataTransfer.setData('text/html', ev.currentTarget.innerHTML)
      return Number(findParent('.row', ev.currentTarget).getAttribute('data-idx'))
    }
  , events.dragstart$)

  let rowOver$ = R.compose(
    flyd_filter(t => t !== null)
  , dropRepeats
  , flyd.map(ev => Number(findParent('.row', ev.target).getAttribute('data-idx')))
  )(events.dragover$)

  let searchTerm$ = flyd.map(ev => ev.currentTarget.value, events.filter$)

  let edit$ = flyd.map(ev => [ev.currentTarget.textContent, Number(findParent('.row', ev.currentTarget).getAttribute("data-idx"))], events.editTask$)

  let pointFilter$ = flyd.map(ev => ev.currentTarget.value, events.filterPoints$)

  let saveToLS$ = flyd_mergeAll([newTask$, events.remove$, events.finishTask$, events.dragend$, edit$])

  let updates = [
    [newTask$,            prependTasks]
  , [events.remove$,      (id, state) => R.assoc('tasks', R.filter(task => task.id !== id, state.tasks), state)]
  , [events.finishTask$,  finishTask]
  , [rowOver$,            R.assoc('rowOverIdx')]
  , [dragging$,           R.assoc('currentlyDraggingIdx')]
  , [events.dragend$,     dropTask]
  , [saveToLS$,           (_, state) => persistLS('queue.tasks', state.tasks) && state]
  , [searchTerm$,         filterTasks]
  , [edit$,               editTask]
  , [pointFilter$,        filterByPoints]
  ]

  return {events, defaultState, updates}
}

const editTask = (pair, state) => {
  let [name, idx] = pair
  let task = R.assoc('name', name, state.tasks[idx])
  let tasks = R.update(idx, task, state.tasks)
  return R.assoc( 'tasks' , tasks, state)
}


const filterTasks = (term, state) => {
  let tasks = R.map(task => R.assoc('hidden', !filterMatch(term, task.name), task), state.tasks)
  return R.merge(state, {tasks: tasks, currentSearch: term})
}


const filterByPoints = (pt, state) =>
  R.assoc('tasks', R.map(t => R.assoc('hidden', t.points < pt, t), state.tasks), state)


const dropTask = (_, state) => {
  let tasks = R.compose(
    R.insert(state.rowOverIdx, state.tasks[state.currentlyDraggingIdx])
  , R.remove(state.currentlyDraggingIdx, 1)
  )(state.tasks)
  return R.compose(
    R.assoc('rowOverIdx', undefined)
  , R.assoc('currentlyDraggingIdx', undefined)
  , R.assoc('tasks', tasks)
  )(state)
}


const finishTask = (task, state) =>
  R.assoc('tasks', R.filter(t => t.id !== task.id, state.tasks), state)

const view = (events, state) => {
  return h('div.queue', [
    newTaskForm(events.submit$, 'Add a new task')
  , h('hr')
  , state.tasks.length ? filterControls(events, state) : ''
  , table(events, state)
  ])
}

const filterControls = (events, state) =>
  h('div.p2', [
      h('input.field.col-6', {
        props: {type: 'text', placeholder: 'Filter by name', value: state.currentSearch}
      , on: {keyup: events.filter$}
      })
    , h('span.inline-block.col-1')
    , h('span.inline-block.col-1')
    , h('select.field.col-2', {on: {change: events.filterPoints$} }, [
        h('option', {props: {value: 1}}, 'At least 1 point')
      , h('option', {props: {value: 2}}, 'At least 2 points')
      , h('option', {props: {value: 3}}, 'At least 3 points')
      , h('option', {props: {value: 4}}, 'At least 4 points')
      , h('option', {props: {value: 5}}, 'At least 5 points')
      ])
  ])

const table = (events, state) => {
  let filtered = R.filter(task => !task.hidden, state.tasks)
  if(!state.tasks.length) return h('p.cleanSlate.mt2.p2.green.bold', 'Your slate is clean.')

  return h('div.mt2', [
    h('div.px2.py1', [
      h('span.gray.bold.inline-block.col-6', filtered.length + (filtered.length === 1 ? ' task' : ' tasks'))
    ])
  , h('div', {on: {dragover: events.dragover$}}, rows(events, filtered, state))
  ])
}

const rows = (events, filtered, state) =>
  R.addIndex(R.map)((task, idx) =>
    h('div.row.px2.py1', {
      props: { draggable: true}
    , class: { isOver: state.rowOverIdx === idx, isDragging: state.currentlyDraggingIdx === idx}
    , attrs: {'data-idx': idx}
    , on: {
        dragend: events.dragend$
      , dragstart: events.dragstart$
      }
    }, [
      h('div.inline-block.col-6.ellipsify', [
        h('span.bold.cursor--type', {
          on: {keyup: events.editTask$}
        , props: {contentEditable: true}
        }
      , task.name)
      ])
    , h('div.inline-block.col-2', R.times(() => h('span.pointDot'), task.points))
    , h('div.inline-block.col-2.gray', moment(task.time).fromNow(true) + ' old')
    , h('div.inline-block.col-2.gray', task.duration
        ? 'focused ' + moment.duration(task.duration, 'seconds').format('mm:ss', {trim: false})
        : '')
    , h('div.showOnRowHover.col-6', [
        h('div.inline-block', [h('a.mr2.btn.btn-primary.bg-green', {on: {click: [events.finishTask$, task]}}, [h('span.icon-checkmark'), ' Finished'])])
      , h('div.inline-block', [h('a.mr2.btn.btn-primary.bg-blue',  {on: {click: [events.startFocus$, task]}}, 'Focus')])
      , h('div.inline-block', [h('a.mr2.btn.btn-primary.bg-blue',  {on: {click: [events.addSubtask$, task]}}, [h('span', {props: {innerHTML: '&#10133;'}}), ' Subtask'])])
      , h('div.inline-block', [h('a.mr2.btn.btn-primary.bg-red', {on: {click: [events.remove$, task.id]}}, [h('span.icon-blocked'), " Remove"])])
      ])
    ])
  , filtered
  )

module.exports = {view, init}



