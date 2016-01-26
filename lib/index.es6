import snabbdom from 'snabbdom'
import flyd from 'flyd'
import timer from './timer.es6'

const patch = snabbdom.init([
  require('snabbdom/modules/class')
, require('snabbdom/modules/props')
, require('snabbdom/modules/style')
, require('snabbdom/modules/eventlisteners')
])

let state$ = timer.init()

let container = document.querySelector('#container')
let vtree$ = flyd.map(timer.view, state$)
let dom$ = flyd.scan(patch, container, vtree$)

