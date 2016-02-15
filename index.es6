import snabbdom from 'snabbdom'
import flyd from 'flyd'
import flyd_ui from './lib/flyd-ui.es6'
import main from './lib/main.es6'
import R from 'ramda'

const patch = snabbdom.init([
  require('snabbdom/modules/class')
, require('snabbdom/modules/props')
, require('snabbdom/modules/style')
, require('snabbdom/modules/eventlisteners')
])

// component -> state$

let state$ = flyd_ui(main.init())

let vtree$ = flyd.map(R.apply(main.view), state$)

flyd.map(s => console.log('%cState stream: %O', "color:green; font-weight: bold;", s), state$)

let dom$ = flyd.scan(
  patch
, document.querySelector('#container')
, vtree$
)

