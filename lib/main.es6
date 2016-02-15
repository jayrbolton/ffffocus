// npm
import h from 'snabbdom/h'
import R from 'ramda'
import flyd from 'flyd'
import flyd_scanMerge from 'flyd/module/scanmerge'
import flyd_flatMap from 'flyd/module/flatmap'
import flyd_filter from 'flyd/module/filter'
import flyd_lift from 'flyd/module/lift'
import flyd_mergeAll from 'flyd/module/mergeall'

// local
import flyd_ui from './flyd-ui.es6'
import queue from './queue.es6'
import finished from './finished.es6'
import timer from './timer.es6'

const init = ()=> {
  let defaultState = { currentPage: localStorage.getItem('currentPage') || 'queue' }
  let events = {
    jumpPage$: flyd.stream()
  , startFocus$: flyd.stream()
  , stopFocus$: flyd.stream()
  , finishTask$: flyd.stream()
  }
 
  // Stream of events that change from page 'timer' back to 'queue'
  let jumpPage$ = flyd_mergeAll([
    events.jumpPage$
  , flyd.map(()=> 'queue', flyd.merge(events.stopFocus$, events.finishTask$))
  , flyd.map(()=> 'timer', events.startFocus$)
  ])

  let saveToLS$ = flyd_mergeAll([jumpPage$])

  // Array of pairs of streams and updater functions that set the state based on new values from the streams
  let updates = [
    [jumpPage$,              R.assoc('currentPage')]
  , [saveToLS$,              persistLS]
  ]

  // Child modules
  let children = {
    queue: queue.init({startFocus$: events.startFocus$, finishTask$: events.finishTask$})
  , finished: finished.init({finishTask$: events.finishTask$})
  , timer: timer.init(events)
  }

  return {defaultState, events, updates, children}
}


const persistLS = (page, state) => {
  localStorage.setItem('currentPage', page)
  return state
}


const view = (events, state) => {
  let content
  if(state.currentPage === 'queue') {
    content = queue.view(events.queue, state.queue)
  } else if(state.currentPage === 'finished') {
    content = finished.view(events.finished, state.finished)
  } else if(state.currentPage === 'timer') {
    return timer.view(events.timer, state.timer)
  }
  return h('div.container.p2', [
    h('ul.list-reset.tabNav.mb0', [
      navBtn(events.jumpPage$, state.currentPage, 'queue')
    , ' '
    , navBtn(events.jumpPage$, state.currentPage, 'finished')
    ])
  // , h('hr')
  , h('main', [content])
  ])
}

const navBtn = (jumpPage$, currentPage, page) =>
  h('li.inline-block', [
    h('a.btn.btn-narrow.blue', {
      on: {click: [jumpPage$, page]}
    , class: {'border': currentPage === page}
    }, R.update(0, page[0].toUpperCase(), page))
  ])

module.exports = {view, init}

