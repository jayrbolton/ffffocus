import h from 'snabbdom/h'
import flyd from 'flyd'
import flyd_scanMerge from 'flyd/module/scanmerge'
import flyd_flatMap from 'flyd/module/flatmap'
import flyd_filter from 'flyd/module/filter'
import flyd_every from 'flyd/module/every'
import flyd_afterSilence from 'flyd/module/aftersilence'
import flyd_keepWhen from 'flyd/module/keepwhen'
import {fromJS as Im} from 'immutable'
import formatMinutes from './format-minutes.es6'

const init = config => {
  let lsTasks = localStorage.getItem('finishedTasks')
  let defaultState = Im({
    newTimer$: flyd.stream()
  , newTask$: flyd.stream()
  , cancelTask$: flyd.stream()
  , finishTask$: flyd.stream()
  , addTime$: flyd.stream()
  , removeFinished$: flyd.stream()
  , pauseTimer$: flyd.stream(false)
  , resetTimer$: flyd.stream()
  , focusTime: -1     // -1 denotes no timing happening; 0 denotes timer is finished; > 0 denotes timer is going
  , accruedTime: 0    // total time spent at a task so far
  , finishedTasks: lsTasks ? JSON.parse(lsTasks) : []
  , isPaused: false
  })

  // Bell to play on timeup (gets played on some streams below)
  let audio = new Audio(config.audioPath)

  // task cancellation and finishing will both reset the timer
  let stopTimer$ = flyd.merge(
    defaultState.get('cancelTask$')
  , defaultState.get('finishTask$')
  )
  
  // A stream of seconds, initialized by every newTimer$ and any addTime$
  let countdown$ = flyd.merge(
    countdownStream(defaultState.get('newTimer$'), defaultState.get('pauseTimer$'), defaultState.get('resetTimer$'), stopTimer$)
  , countdownStream(defaultState.get('addTime$'),  defaultState.get('pauseTimer$'), defaultState.get('resetTimer$'), stopTimer$)
  )

  // Play audio when the countdown stream hits 0
  // Stop the audio when they hit "Finished", "Cancel", or an add time button
  flyd.map(()=> {audio.currentTime = 0; audio.play()},  flyd_filter(n => n === 0, countdown$))
  flyd.map(()=> audio.pause(), flyd.merge(stopTimer$, defaultState.get('addTime$')))

  let state$ = flyd.immediate(flyd_scanMerge([
    [defaultState.get('newTimer$'),       (state, m)  => state.set('focusTime', m)]
  , [defaultState.get('newTask$'),        (state, ev) => state.set('currentTask', ev.target.value)]
  , [defaultState.get('finishTask$'),     appendFinishedTask]
  , [stopTimer$,                          resetTimerState]
  , [countdown$,                          (state, n)  => state.set('focusTime', n).set('accruedTime', state.get('accruedTime') + 1)]
  , [defaultState.get('removeFinished$'), removeFinishedTask]
  , [defaultState.get('pauseTimer$'),     (state, p) => state.set('isPaused', p)]
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
    state.get('finishedTasks').unshift(Im({
      name: state.get('currentTask') || 'Unnamed task'
    , time: state.get('accruedTime') - 1 // subtract one because it will +1 for 00:00
    }))
  )

const resetTimerState = state =>
  state.set('focusTime', -1)
       .set('accruedTime', 0)
       // .delete('currentTask')


// Create a stream of seconds counting down from times on the newTimer$ stream
// You can pause it, reset it, or stop it
const countdownStream = (start$, pause$, reset$, stop$) => {
  let notPaused$ = flyd.map(p => !p ? true : false, pause$)
  return flyd_flatMap(m => {
    let start = m * 60
    let seconds$ = flyd_scanMerge([
      [flyd_keepWhen(notPaused$, flyd_every(1000)),   count => count - 1]
    , [reset$,   count => start]
    ], start + 1)
    let end$ = flyd_filter(s => s < 0, seconds$)
    return flyd.endsOn( flyd.merge(stop$, end$) , seconds$)
  }, start$)
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
      Im([3, 5, 7, 10, 15, 20])
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
  , h('button.btn.btn-primary.bg-teal', {on: {click: [state.get('pauseTimer$'), !state.get('isPaused')]}}
    , state.get('isPaused') ? 'Start' : 'Pause')
  , ' '
  , h('button.btn.btn-primary.bg-green', {on: {click: [state.get('resetTimer$'), true]}}, 'Reset')
  , ' '
  , h('button.btn.btn-primary.bg-gray', {on: {click: state.get('cancelTask$')}}, 'Cancel')
  ])


const newTask = state =>
  h('div.newTask', [
    h('p', `Choose a single task that takes 5-30 minutes,
      write a short description of its outcome,
      and choose a goal amount of time you think you can finish it in.`)
  , h('form', {on: {click: e => e.preventDefault()}}, [
      h('input.field.col-5',  {on: {change: state.get('newTask$')}, props: {type: 'text', placeholder: 'Task outcome', value: state.get('currentTask')}})
    , ' '
      ].concat(
        Im([5, 10, 15, 20, 25, 30])
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
