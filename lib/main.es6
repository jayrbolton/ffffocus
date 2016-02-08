// npm
import h from 'snabbdom/h'
import R from 'ramda'
import flyd from 'flyd'
import flyd_scanMerge from 'flyd/module/scanmerge'
import flyd_flatMap from 'flyd/module/flatmap'
import flyd_filter from 'flyd/module/filter'
import flyd_lift from 'flyd/module/lift'

// local
import queue from './queue.es6'
import finished from './finished.es6'
import timer from './timer.es6'

const init = ()=> {
  let lsTasks = localStorage.getItem('finishedTasks')
  let state = {
    jumpPage$: flyd.stream()
  , currentPage: 'queue'
  }

  let state$ = flyd.immediate(flyd_scanMerge([
    [state.jumpPage$,              (state, page) => R.assoc('currentPage', page, state)]
  ], state))

  let queue$ = queue.init()
  state$ = flyd.immediate(flyd_lift(R.assoc('queue'), queue$, state$))

  let finished$ = finished.init(queue$)
  state$ = flyd.immediate(flyd_lift(R.assoc('finished'), finished$, state$))

  let timer$ = timer.init(queue$)
  state$ = flyd.immediate(flyd_lift(R.assoc('timer'), timer$, state$))

  flyd.map(s => console.log("STATE", s), state$)
  
  return state$
}

const view = state => {
  let content
  if(state.currentPage === 'queue') {
    content = queue.view(state.queue)
  } else if(state.currentPage === 'finished') {
    content = finished.view(state.finished)
  } else if(state.currentPage === 'timer') {
    return timer.view(state.timer)
  }
  return h('div.container.p2', [
    h('ul.tabNav', [
      h('li', [h('a.btn.btn-primary.bg-gray', {on: {click: [state.jumpPage$, 'queue']},    class: {'bg-teal': state.currentPage === 'queue'}},    'Queue')])
    , h('li', [h('a.btn.btn-primary.bg-gray', {on: {click: [state.jumpPage$, 'finished']}, class: {'bg-teal': state.currentPage === 'finished'}}, 'Finished')])
    ])
  , h('main', [content])
  ])
}

module.exports = {view, init}

