import snabbdom from 'snabbdom'
import flyd from 'flyd'
import timer from './lib/timer.es6'

const patch = snabbdom.init([
  require('snabbdom/modules/class')
, require('snabbdom/modules/props')
, require('snabbdom/modules/style')
, require('snabbdom/modules/eventlisteners')
])

let state$ = timer.init({audioPath: 'audio/bell.mp3'})
flyd.map(s => console.log('accruedTime', s.get("accruedTime")), state$)
flyd.map(s => console.log('focusTime', s.get("focusTime")), state$)
flyd.map(s => console.log('finishedTasks', s.get("finishedTasks").toJS()), state$)
flyd.map(s => console.log('currentTask', s.get("currentTask")), state$)

let container = document.querySelector('#container')
let vtree$ = flyd.map(timer.view, state$)
let dom$ = flyd.scan(patch, container, vtree$)

