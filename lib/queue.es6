// Queue of todo items!

import h from 'snabbdom/h'
import R from 'ramda'
import flyd from 'flyd'
import flyd_scanMerge from 'flyd/module/scanmerge'
import flyd_flatMap from 'flyd/module/flatmap'
import flyd_filter from 'flyd/module/filter'
import moment from 'moment'


const init = () => {
  let state = {
    tasks: [] // queued unfinished tasks
  , finished: [] // finished tasks
  , finish$: flyd.stream() // click finish button for task
  , remove$: flyd.stream() // click x remove button on task row
  , focus$:  flyd.stream() // click focus button on task row
  , submit$: flyd.stream() // new task form submit
  }

  let newTask$ = R.compose(
    flyd.map(name => ({name: name, time: Date.now()}))
  , flyd.map(ev => {
      ev.preventDefault()
      let val = ev.currentTarget.querySelector('input').value
      ev.target.reset()
      return val
    })
  )(state.submit$)

  flyd.map(t => console.log(t), newTask$)

  // streams
  // finish task
  // focus on task
  // add new task
  // delete task
  let state$ = flyd.immediate(flyd_scanMerge([
    [newTask$,           (state, t) => R.assoc('tasks', R.prepend(t, state.tasks), state)]
  , [state.remove$,      (state, name) => R.assoc('tasks', R.filter(task => task.name !== name, state.tasks), state)]
  , [state.finish$,      finishTask]
  ], state))
  
  return state$
}

const finishTask = (state, name) => {
  let task = R.find(t => t.name === name, state.tasks)
  return R.compose(
    R.assoc('tasks', R.filter(t => t.name !== name, state.tasks))
  , R.assoc('finished', R.prepend(task, state.finished))
  )(state)
}

const view = state => {
  return h('div.queue', [
    h('form.newTask', {
      on: {submit: state.submit$}
    }, [
      h('label', 'new task:')
    , ' '
    , h('input.field', {props: {type: 'text', placeholder: 'Task outcome'}})
    , table(state)
    ])
  ])
}

const table = state => {
  if(!state.tasks.length) return h('p.cleanSlate', 'your slate is clean.')

  return h('table.table-light', [
    h('tbody', R.map(
      t => h('tr', [
        h('td', t.name)
      , h('td', 'added ' + moment(t.time).fromNow())
      , h('td', [h('a', {on: {click: state.focus$}}, 'Focus')])
      , h('td', [h('a', {on: {click: [state.finish$, t.name]}}, 'Finished')])
      , h('td', [h('a', {props: {innerHTML: '&times;'}, on: {click: [state.remove$, t.name]}})])
      ])
    , state.tasks
    ))
  ])
}

module.exports = {view, init}
