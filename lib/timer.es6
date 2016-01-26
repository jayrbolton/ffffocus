import h from 'snabbdom/h'
import flyd from 'flyd'
import flyd_scanMerge from 'flyd/module/scanmerge'
import flyd_flatMap from 'flyd/module/flatmap'
import flyd_every from './flyd-every.es6'
import flyd_filter from 'flyd/module/filter'
import flyd_delay from './flyd-delay.es6'
import {fromJS} from 'immutable'
import moment from 'moment'
import 'moment-duration-format'

const init = config => {
  let defaultState = fromJS({
    newTimer$: flyd.stream()
  , task$: flyd.stream()
  , resetTimer$: flyd.stream()
  , focusTime: false
  })

  flyd.map(x => console.log(x), defaultState.get('newTimer$'))

  // A stream of seconds, initialized by every newTimer$
  let countdown$ = flyd_flatMap(
    m => {
      return flyd.immediate(flyd.endsOn(
        flyd.merge(
          defaultState.get('resetTimer$')
        , flyd_delay(m * 60000)
        )
      , flyd.immediate(flyd.scan(n => n - 1, m * 60 - 1, flyd_every(1000)))
      ))
    }
    , defaultState.get('newTimer$')
  )

  return flyd.immediate(flyd_scanMerge([
    [defaultState.get('newTimer$'),     (state, m)  => state.set('focusTime', m)]
  , [defaultState.get('task$'),        (state, ev) => state.set('currentTask', ev.target.value)]
  , [defaultState.get('resetTimer$'),  state       => state.set('focusTime', 0)]
  , [countdown$,                       (state, n)  => state.set('focusTime', n)]
  ], defaultState))
}

const view = state => 
  state.get('focusTime')
  ? h('div.timer', [
      h('p', [
        'Focus on '
      , h('strong', state.get('currentTask') || 'current task')
      , ' for '
      , h('strong', moment.duration(state.get('focusTime') / 60, 'minutes').format("mm:ss", {trim: false}))
      ])
    , h('button', {on: {click: [state.get('resetTimer$'), true]}}, 'Finished')
    , h('button', {on: {click: [state.get('resetTimer$'), true]}}, 'Cancel')
    ])
  : h('div.newTask', [
      h('input',  {on: {change: state.get('task$')}, props: {type: 'text', placeholder: 'Short task description'}})
      ].concat(
        [0.1, 1, 3, 5, 10, 15, 20, 25, 30]
        .map(m => h('button', {on: {click: [state.get('newTimer$'), m]}}, m + 'm'))
      )
    )

module.exports = {view, init}
