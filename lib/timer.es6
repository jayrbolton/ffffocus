// Task timer/timeboxer!


import h from 'snabbdom/h'
import R from 'ramda'
import flyd from 'flyd'
import flyd_scanMerge from 'flyd/module/scanmerge'
import flyd_flatMap from 'flyd/module/flatmap'
import flyd_filter from 'flyd/module/filter'
import flyd_every from 'flyd/module/every'
import flyd_afterSilence from 'flyd/module/aftersilence'
import flyd_keepWhen from 'flyd/module/keepwhen'
import moment from 'moment'
import formatMinutes from './format-minutes.es6'

const init = (queue$) => {
  let state = {
    currentTask: false
  , accruedSeconds: 0 // total accrued seconds of focus time
  , startFocus$: queue$().focus$ // starting focus time comes from an event in the queue component
  , addCountdown$: flyd.stream() // add time to the countdown stream
  , pause$: flyd.stream() // pause focus time
  , finishTask$: flyd.stream() // finish the current task
  , cancelTask$: flyd.stream() // cancel out of focus time, jump back to queue
  , isCountingDown: false // has the user added time for timeboxing?
  , isPaused: false // is the timer paused?
  }

  // Bell to play on timeup (gets played on some streams below)
  let audio = new Audio('audio/bell.mp3')

  // task cancellation and finishing will both reset the timer
  let resetTimer$ = flyd.merge(
    state.cancelTask$
  , state.finishTask$
  )
  
  // A stream of seconds, initialized by every newTimer$ and any addTime$
  /*
  let countdown$ = flyd.merge(
    countdownStream(state.newTimer$, state.pauseTimer$, state.resetTimer$, resetTimer$)
  , countdownStream(state.addTime$,  state.pauseTimer$, state.resetTimer$, resetTimer$)
  )
  */

  // Play audio when the countdown stream hits 0
  // Stop the audio when they hit "Finished", "Cancel", or an add time button
  /*
  flyd.map(()=> {audio.currentTime = 0; audio.play()},  flyd_filter(n => n === 0, countdown$))
  flyd.map(()=> audio.pause(), flyd.merge(resetTimer$, state.addTime$))
  */

  let state$ = flyd.immediate(flyd_scanMerge([
        /*
    [state.newTimer$,       (state, m)  => R.assoc('focusTime', m, state)]
  , [state.newTask$,        (state, ev) => R.assoc('currentTask', ev.target.value, state)]
  , [state.finishTask$,     appendFinishedTask]
  , [resetTimer$,           resetTimerState]
  , [countdown$,            (state, n)  => R.compose(R.assoc('focusTime', n), R.assoc('accruedTime', state.accruedTime + 1))(state)]
  , [state.removeFinished$, removeFinishedTask]
  , [state.pauseTimer$,     (state, p) => R.assoc('isPaused', p, state)]
  */
  ], state))

  // Cache finished tasks to localStorage
  flyd.map(
    state => localStorage.setItem('finishedTasks', JSON.stringify(state.finishedTasks))
  , state$
  )

  return state$
}

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
  let timer = state.isCountingDown
  ? h('p', [
      'try to finish within '
    , formatMinutes(state.secondsLeft)
    ])
  : h('p', [
      'you\'ve been focusing on this task for '
    , formatMinutes(state.accruedSeconds)
    ])

  return h('div.timer', [
    h('h3', [
      'focus on '
    , state.currentTask.name
    ])
  , timer
  , addTime(state)
  , controls(state)
  ])
}

const addTime = state => {
  return h('p', 'add time here')
}

const controls = state => {
  return h('p', 'controls here')
}
    /*(
    ])
    h('p', [
      'Try to finish '
    , h('input.field', {props: {type: 'text', value: state.currentTask || 'your current task'}})
    , ' '
    , ' within '
    , h('strong', formatMinutes(state.focusTime / 60))
    ])
  , h('button.btn.btn-primary', {on: {click: state.finishTask$}}, 'Finished')
  , ' '
  , h('button.btn.btn-primary.bg-teal', {on: {click: [state.pauseTimer$, !state.isPaused]}}
    , state.isPaused ? 'Start' : 'Pause')
  , ' '
  , h('button.btn.btn-primary.bg-gray', {on: {click: state.cancelTask$}}, 'Cancel')
  , h('div.mt2', [
      h('p', 'Add more time:')
    ].concat(
      R.compose(
        R.intersperse(' ')
      , R.map(m => h('button.btn.btn-primary.bg-olive', {on: {click: [state.addTime$, m]}}, '+' + m + 'm'))
      )([0.05, 3, 5, 7, 10, 15, 20])
    ))
  ])
  */

module.exports = {view, init}

/*
const init = config => {


const removeFinishedTask = (state, task) =>
  R.assoc('finishedTasks', R.filter(t => t.name !== task.name), state.finishedTasks)

// Updater function that appends the last timed task to the finishedTasks list
const appendFinishedTask = state =>
  R.assoc('finishedTasks', R.prepend({
      name: state.currentTask || 'Unnamed task'
    , duration: state.accruedTime - 1 // subtract one because it will +1 for 00:00
    , time: Date.now()
  }, state.finishedTasks))

const resetTimerState = state =>
  R.compose(
    R.assoc('focusTime', -1)
  , R.assoc('accruedTime', 0)
  )(state)


const view = state => {
  let content
  if(state.currentPage === 'queue') {
    content = queue.view(state.queue)
  } else if(state.currentPage === 'finished') {
    content = finished.view(state.finished)
  }
  return h('div.container.p2', [
    h('ul.tabNav', [
      h('li', [h('a.btn.btn-primary.bg-gray', {on: {click: [state.jumpPage$, 'queue']},    class: {'bg-teal': state.currentPage === 'queue'}},    'Queue')])
    , h('li', [h('a.btn.btn-primary.bg-gray', {on: {click: [state.jumpPage$, 'finished']}, class: {'bg-teal': state.currentPage === 'finished'}}, 'Finished')])
    ])
  , h('main', [content])
  ])
}

const timerDone = state =>
  h('div.timerDone', [
    h('p', 'Did you finish?')
  , h('button.btn.btn-primary', {on: {click: state.finishTask$}}, 'Finished')
  , ' '
  ])


const timer = state =>
  h('div.timer', [
    h('p', [
      'Try to finish '
    , h('input.field', {props: {type: 'text', value: state.currentTask || 'your current task'}})
    , ' '
    , ' within '
    , h('strong', formatMinutes(state.focusTime / 60))
    ])
  , h('button.btn.btn-primary', {on: {click: state.finishTask$}}, 'Finished')
  , ' '
  , h('button.btn.btn-primary.bg-teal', {on: {click: [state.pauseTimer$, !state.isPaused]}}
    , state.isPaused ? 'Start' : 'Pause')
  , ' '
  , h('button.btn.btn-primary.bg-gray', {on: {click: state.cancelTask$}}, 'Cancel')
  , h('div.mt2', [
      h('p', 'Add more time:')
    ].concat(
      R.compose(
        R.intersperse(' ')
      , R.map(m => h('button.btn.btn-primary.bg-olive', {on: {click: [state.addTime$, m]}}, '+' + m + 'm'))
      )([0.05, 3, 5, 7, 10, 15, 20])
    ))
  ])


const newTask = state =>
  h('div.newTask', [
    h('p', `Choose a single task that takes 5-30 minutes,
      write a short description of its outcome,
      and choose a goal amount of time you think you can finish it in.`)
  , h('form', {on: {click: e => e.preventDefault()}}, [
      h('input.field.col-5',  {on: {change: state.newTask$}, props: {type: 'text', placeholder: 'Task outcome', value: state.currentTask}})
    , ' '
      ].concat(
        R.compose(
          R.intersperse(' ')
        , R.map(m => h('button.btn.btn-primary.bg-olive', {on: {click: [state.newTimer$, m]}}, m + 'm'))
        )([0.05, 5, 10, 15, 20, 25, 30])
      )
    )
  ])


const taskHistory = state => {
  if(!state.finishedTasks.length) return h('div', '')
  tasks = state.finishedTasks.map(t => R.assoc('time', moment(t.time), t))
  // Group tasks by day
  let tasks = tasks.groupBy(t => [t.time.date(), t.time.month()])
  return h('div.finishedTasks', [
    h('h3', 'Finished Tasks')
  ].concat(
    tasks.valueSeq().map(tasks =>
      h('div.finishedTasks-day', [
        h('h4', tasks.first().time.format('dddd, DD/MM/YY')) // String(group))
      , h('table.table-light.mt3', [
          h('tbody',
            tasks.map(t =>
              h('tr', [
                h('td', t.name)
              , h('td', ' finished in '+ formatMinutes(t.duration / 60))
              , h('td', ' at ' + moment(t.time).format('HH:MM'))
              , h('td', [h('button.btn', {on: {click: [state.removeFinished$, t]}}, 'X')])
              ])
            )
          )
        ])
      ])
    )
  ))
  /*
}
  */


module.exports = {view, init}
