// npm
import h from 'snabbdom/h'
import R from 'ramda'
import flyd from 'flyd'
import flyd_scanMerge from 'flyd/module/scanmerge'
import flyd_flatMap from 'flyd/module/flatmap'
import flyd_filter from 'flyd/module/filter'
import flyd_mergeAll from 'flyd/module/mergeall'
import moment from 'moment'

import flyd_ui from './flyd-ui.es6'

const init = events => {
  events = R.merge({
    remove$: flyd.stream()
  , submit$: flyd.stream()
  , startFocus$: flyd.stream()
  , finishTask$: flyd.stream()
  }, events)

  let defaultState = { tasks: [] } // queued unfinished tasks

  // Load task data from localStorage
  let json = localStorage.getItem('queue.tasks')
  if(json) {
    defaultState.tasks = JSON.parse(json)
  }

  let newTask$ = R.compose(
    flyd.map(name => ({name: name, time: Date.now()}))
  , flyd.map(ev => {
      ev.preventDefault()
      let val = ev.currentTarget.querySelector('input').value
      ev.target.reset()
      return val
    })
  )(events.submit$)

  let saveToLS$ = flyd_mergeAll([newTask$, events.remove$, events.finishTask$])

  let updates = [
    [newTask$,            (t, state) => R.assoc('tasks', R.prepend(t, state.tasks), state)]
  , [events.remove$,      (name, state) => R.assoc('tasks', R.filter(task => task.name !== name, state.tasks), state)]
  , [events.finishTask$,  finishTask]
  , [saveToLS$,           persistLS]
  ]

  return {events, defaultState, updates}
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
      h('label.col-2.inline-block.bold.navy', 'New task:')
    , ' '
    , h('input.field.col-6', {props: {type: 'text', placeholder: 'Describe the task\'s outcome.'}})
    ])
  , table(events, state)
  ])
}

const table = (events, state) => {
  if(!state.tasks.length) return h('p.cleanSlate.mt2.p2.green.bold', 'Your slate is clean.')

  return h('table.table-light.mt2', [
    h('thead', [
      h('tr', [
        h('th.gray', state.tasks.length + ' total')
      , h('th')
      , h('th')
      , h('th')
      , h('th')
      ])
    ])
  , h('tbody', R.map(
      t => h('tr', [
        h('td.px2.py1.align-middle', [h('strong', t.name)])
      , h('td.px2.py1.align-middle.gray', 'added ' + moment(t.time).fromNow())
      , h('td.px2.py1.align-middle', [h('a.btn.btn-outline.blue',  {on: {click: [events.startFocus$, t]}}, 'Focus')])
      , h('td.px2.py1.align-middle', [h('a.btn.btn-outline.green', {on: {click: [events.finishTask$, [t, 0]]}}, 'Finished')])
      , h('td.px2.py1.align-middle', [h('a.btn.red', {props: {innerHTML: '&times;'}, on: {click: [events.remove$, t.name]}})])
      ])
    , state.tasks
    ))
  ])
}

module.exports = {view, init}

