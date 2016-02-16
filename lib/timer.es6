// npm
import h from 'snabbdom/h'
import R from 'ramda'
import flyd from 'flyd'
import flyd_flatMap from 'flyd/module/flatmap'
import flyd_filter from 'flyd/module/filter'
import flyd_every from 'flyd/module/every'
import flyd_afterSilence from 'flyd/module/aftersilence'
import flyd_keepWhen from 'flyd/module/keepwhen'
import flyd_mergeAll from 'flyd/module/mergeall'
import flyd_scan from './flyd-better-scan'
import flyd_lift from 'flyd/module/lift'
import moment from 'moment'
import 'moment-duration-format'

const init = events => {
  let defaultState = {
    currentTask: false
  , accruedSeconds: 0 // total accrued seconds of focus time
  , isCountingDown: false // has the user added time for timeboxing?
  , isPaused: false // is the timer paused?
  }

  events = R.merge({
    addCountdown$: flyd.stream() // add time to the countdown stream
  , pauseTimer$: flyd.stream(false) // pause focus time
  , setLimit$: flyd.stream()
  }, events)

  let resetTimer$ = flyd_mergeAll([events.stopFocus$, events.finishTask$])

  let timer$ = timerStream(events.startFocus$, events.pauseTimer$, resetTimer$)

  // Bell to play on timeup (gets played on some streams below)
  let audio = new Audio('audio/bell.mp3')
  let play$ = R.compose(
    flyd.map(()=> {audio.currentTime = 0; audio.play()})
  , flyd.map(console.log.bind(console))
  , flyd_filter(R.apply(R.equals))
  , flyd_filter(R.apply((s, l) => s && l))
  )(flyd_lift((t, l) => [t, l *60], timer$, events.setLimit$))

  flyd.map(()=> audio.pause(), flyd_mergeAll([events.pauseTimer$, resetTimer$, events.finishTask$]))

  // flyd.map(console.log.bind(console), flyd_lift((t, l) => [t, l*60], timer$, events.setLimit$))

  // Play audio when the countdown stream hits 0
  // Stop the audio when they hit "Finished", "Cancel", or an add time button
  /*
  flyd.map(()=> {audio.currentTime = 0; audio.play()},  flyd_filter(n => n === 0, countdown$))
  flyd.map(()=> audio.pause(), flyd.merge(resetTimer$, state.addTime$))
  */

  let updates = [
    [events.startFocus$,  R.compose(R.assoc('limit', 0), R.assoc('currentTask'))]
  , [timer$,              R.assoc('accruedSeconds')]
  , [events.setLimit$,    (m, state) => R.assoc('limit', m * 60, state)]
  , [events.pauseTimer$,  R.assoc('isPaused')]
  // , [stopTask$,             state => R.assoc('currentTask', false)]
        /*
    [state.newTimer$,       (state, m)  => R.assoc('focusTime', m, state)]
  , [state.newTask$,        (state, ev) => R.assoc('currentTask', ev.target.value, state)]
  , [resetTimer$,           resetTimerState]
  , [countdown$,            (state, n)  => R.compose(R.assoc('focusTime', n), R.assoc('accruedTime', state.accruedTime + 1))(state)]
  , [state.removeFinished$, removeFinishedTask]
  */
  ]

  return {defaultState, events, updates}
}


// Create a stream of seconds counting down from times on the newTimer$ stream
// You can pause it, reset it, or stop it
const timerStream = (start$, pause$, reset$) => {
  let notPaused$ = flyd.map(p => !p ? true : false, pause$)
  return flyd_flatMap(m => {
    return R.compose(
      R.curry(flyd.endsOn)(reset$)
    , flyd_scan(n => n + 1, -2)
    , flyd_keepWhen(notPaused$)
    )(flyd_every(1000))
  }, start$)
}


const view = (events, state) => {

  return h('div.timer', [
    h('h1', [
      'Focus on '
    , h('span.green', String(state.currentTask.name))
    ])
  , stopWatch(events, state)
  , h('hr')
  , controls(events, state)
  ])
}


const stopWatch = (events, state) => {
  let content
  if(!state.limit) {
    content = [
      state.isPaused
      ? 'Paused at '
      : 'You\'ve been focusing on this task for '
    , h('strong', formatSecs(state.accruedSeconds))
    , h('hr')
    , addTime('Set a limit', events, state)
    ]
  } else if(state.limit - state.accruedSeconds < 0) {
    content = [
      'You\'re over your limit by '
    , h('strong', formatSecs(Math.abs(state.limit - state.accruedSeconds)))
    , h('hr')
    , addTime('Add time', events, state)
    ]
  } else {
    content = [
      state.isPaused
      ? 'Paused at '
      : 'Try to finish within '
    , h('strong', formatSecs(state.limit - state.accruedSeconds))
    ]
  }

  return h('div', content)
}


const formatSecs = s => moment.duration(s, 'seconds').format('mm:ss', {trim: false})


const addTime = (txt, events, state) => {
  let timeBtns = R.compose(
    R.intersperse(" ")
  , R.map(m => h('a.btn.btn-primary.bg-olive', {on: {click: [events.setLimit$, m]}}, [String(m) + 'm']))
  , R.filter(m => !state.limit || m * 60 > state.limit)
  )([5, 10, 15, 20, 25, 30, 45, 60])

  return h('div.timebox.mt2.mb2', 
    R.concat(
      [h('p.mb0.col-1.inline-block', txt + ': ')]
    , timeBtns
    )
  )
}

const controls = (events, state) => {
  return h('div.focus-controls.mt2', [
    h('a.btn.btn-primary.bg-aqua', {on: {click: [events.pauseTimer$, !state.isPaused]}} , state.isPaused ? 'Play' : 'Pause')
  , ' '
  , h('a.btn.btn-primary', {on: {click: [events.finishTask$, [state.currentTask, state.accruedSeconds]]}}, 'Finished')
  , ' '
  , h('a.btn.btn-primary.bg-gray', {on: {click: [events.stopFocus$, state.currentTask]}}, 'Cancel')
  ])
}

module.exports = {view, init}
