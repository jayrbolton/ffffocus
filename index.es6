import snabbdom from 'snabbdom'
import flyd from 'flyd'
import main from './lib/main.es6'

const patch = snabbdom.init([
  require('snabbdom/modules/class')
, require('snabbdom/modules/props')
, require('snabbdom/modules/style')
, require('snabbdom/modules/eventlisteners')
])

let state$ = main.init()

let container = document.querySelector('#container')
let vtree$ = flyd.map(main.view, state$)
let dom$ = flyd.scan(patch, container, vtree$)

