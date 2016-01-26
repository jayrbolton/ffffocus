import h from 'snabbdom/h'
import flyd from 'flyd'
import flyd_scanMerge from 'flyd/module/scanmerge'
import flyd_flatMap from 'flyd/module/flatmap'
import flyd_every from './flyd-every.es6'
import flyd_filter from 'flyd/module/filter'
import flyd_delay from './flyd-delay.es6'
import {fromJS} from 'immutable'
import formatMinutes from './format-minutes.es6'

const init = config => {
  let lsTasks = localStorage.getItem('finishedTasks')
  let defaultState = fromJS({
    newTimer$: flyd.stream()
  , newTask$: flyd.stream()
  , cancelTask$: flyd.stream()
  , finishTask$: flyd.stream()
  , addTime$: flyd.stream()
  , removeFinished$: flyd.stream()
  , focusTime: -1     // -1 denotes no timing happening; 0 denotes timer is finished; > 0 denotes timer is going
  , accruedTime: 0    // total time spent at a task so far
  , finishedTasks: lsTasks ? fromJS(JSON.parse(lsTasks)) : []
  })

  // task cancellation and finishing will both reset the timer
  let resetTimer$ = flyd.merge(
    defaultState.get('cancelTask$')
  , defaultState.get('finishTask$')
  )

  // A stream of seconds, initialized by every newTimer$ and any addTime$
  let countdown$ = flyd.merge(
    countdownStream(defaultState.get('newTimer$'), resetTimer$)
  , countdownStream(defaultState.get('addTime$'), resetTimer$)
  )

  let state$ = flyd.immediate(flyd_scanMerge([
    [defaultState.get('newTimer$'),     (state, m)  => state.set('focusTime', m)]
  , [defaultState.get('newTask$'),      (state, ev) => state.set('currentTask', ev.target.value)]
  , [defaultState.get('finishTask$'),   appendFinishedTask]
  , [resetTimer$,                       resetTimerState]
  , [countdown$,                        (state, n)  => state.set('focusTime', n).set('accruedTime', state.get('accruedTime') + 1)]
  , [defaultState.get('removeFinished$'),                   removeFinishedTask]
  ], defaultState))

  // Cache finished tasks to localStorage
  flyd.map(
    state => localStorage.setItem('finishedTasks', JSON.stringify(state.get('finishedTasks')))
  , state$
  )
  
  return state$
}

const removeFinishedTask = (state, task) =>
  state.set('finishedTasks',
    state.get('finishedTasks').delete(
      state.get('finishedTasks').findIndex(t => t.equals(task))
  ))

// Updater function that appends the last timed task to the finishedTasks list
const appendFinishedTask = state =>
  state.set('finishedTasks',
    state.get('finishedTasks').unshift(fromJS({
      name: state.get('currentTask') || 'Unnamed task'
    , time: state.get('accruedTime')
    }))
  )

const resetTimerState = state =>
  state.set('focusTime', -1)
       .set('accruedTime', 0)
       .delete('currentTask')

// Create a stream of seconds counting down from times on the newTimer$ stream
const countdownStream = (newTimer$, resetTimer$) => {
  return flyd_flatMap(
    m => flyd.endsOn(
      flyd.merge(resetTimer$, flyd_delay(m * 60000))
    , flyd.scan(n => n - 1, m * 60 - 1, flyd_every(1000))
    )
  , newTimer$
  )
}


const view = state => {
  let content
  if(state.get('focusTime') === 0) {
    content = [timerDone(state)]
  } else if(state.get('focusTime') > 0) {
    content = [timer(state)]
  } else {
    content = [newTask(state), taskHistory(state)]
  }
  return h('div.container.p2', [h('main', content)])
}
  

const timerDone = state =>
  h('div.timerDone', [
    h('p', 'Did you finish?')
  , h('button.btn.btn-primary', {on: {click: state.get('finishTask$')}}, 'Finished')
  , ' '
  , h('button.btn.btn-primary.bg-gray', {on: {click: state.get('cancelTask$')}}, 'Cancel')
  , h('div.mt2', [
      h('p', 'Or, add more time')
    ].concat(
      fromJS([3, 5, 7, 10, 15, 20])
      .map(m => h('button.btn.btn-primary.bg-olive', {on: {click: [state.get('addTime$'), m]}}, '+' + m + 'm'))
      .interpose(' ').toJS()
    ))
  ])


const timer = state =>
  h('div.timer', [
    h('p', [
      'Try to finish '
    , h('strong', state.get('currentTask') || 'your current task')
    , ' within '
    , h('strong', formatMinutes(state.get('focusTime') / 60))
    ])
  , h('button.btn.btn-primary', {on: {click: state.get('finishTask$')}}, 'Finished')
  , ' '
  , h('button.btn.btn-primary.bg-gray', {on: {click: state.get('cancelTask$')}}, 'Cancel')
  ])


const newTask = state =>
  h('div.newTask', [
    h('p', `Choose a single task that takes 5-30 minutes,
      write a short description of its outcome,
      and choose a goal amount of time you think you can finish it in.`)
  , h('form', {on: {click: e => e.preventDefault()}}, [
      h('input.field.col-5',  {on: {change: state.get('newTask$')}, props: {type: 'text', placeholder: 'Task outcome'}})
    , ' '
      ].concat(
        fromJS([5, 10, 15, 20, 25, 30])
        .map(m => h('button.btn.btn-primary.bg-olive', {on: {click: [state.get('newTimer$'), m]}}, m + 'm'))
        .interpose(' ').toJS()
      )
    )
  ])


const taskHistory = state =>
  h('table.table-light.mt3', [
    h('thead', state.get('finishedTasks').count() ? [h('tr', [h('th', 'Finished Tasks'), h('th', ''), h('th', '')])] : '')
  , h('tbody',
      state.get('finishedTasks')
      .map(
        t => h('tr', [
          h('td', t.get('name'))
        , h('td', ' finished in '+ formatMinutes(t.get('time') / 60))
        , h('td', [h('button.btn', {on: {click: [state.get('removeFinished$'), t]}}, 'X')])
        ])
      ).toJS()
    )
  ])


module.exports = {view, init}
