import flyd from 'flyd'
import flyd_lift from 'flyd/module/lift'
import flyd_scanMerge from 'flyd/module/scanmerge'
import R from 'ramda'

// Use this 

// Given a UI component object with these keys:
//   events: an object of event names set to flyd streams
//   defaultState: an initial default state (plain js object) to be set immediately on pageload
//   updates: an array of pairs of flyd streams and updater functions (with each stream, make an update on the state for each new value on that stream)
//   children: an object of child module namespaces (keys) and child module state streams (values) to be mixed into this module
// Return:
//   A single state stream that combines the default state, updaters, and child components
function ui(component) {
  // Array of child state streams (NOTE: recursive)
  let childStreams = R.compose(
    R.toPairs
  , R.map(ui)
  )(component.children || [])

  // Array of static default states for every child component
  // Note this is an array of child module keys and a pair of child module events and child module default states
  let childDefaults      = R.map(R.apply((key, $)    => [key, $()]), childStreams)
  let childDefaultStates = R.map(R.apply((key, pair) => [key, R.last(pair)]), childDefaults)
  let childEvents        = R.map(R.apply((key, pair) => [key, R.head(pair)]), childDefaults)

  // Merge in every default child state under a key within the parent state
  component.defaultState = R.reduce(
    (parentState, pair) => {
      let [childKey, childState] = pair
      return R.assoc(childKey, R.merge(parentState[childKey], childState), parentState)
    }
  , component.defaultState
  , childDefaultStates
  )

  // Nest child event objects into the parent events obj
  component.events = R.reduce(
    (parentEvents, pair) => {
      let [childKey, childEvents] = pair
      return R.assoc(childKey, R.merge(parentEvents[childKey], childEvents), parentEvents)
    }
  , component.events
  , childEvents
  )

  // Turn the array of child component streams ([key, stream]) into an array of pairs that can go into flyd/module/scanMerge
  // [key, stream] -> [[stream, (state, [events, childState]) -> state]]
  // Every new state on each child stream updates the nested child state in the parent component
  let childUpdaters = R.map(
    R.apply((key, stream) => [stream, (state, pair) => R.assoc(key, R.merge(state[key], R.last(pair)), state)])
  , childStreams
  )
  
  // Every parent update on a child state updates the child component

  // Concat the child component updaters with this component's updaters
  // Flip the component's updater functions to make it more compatible with Ramda functions
  // the updater functions for flyd_scanMerge are like scan, they take (accumulator, val) -> accumulator
  // instead we want (val, accumulator) -> accumulator
  // That way we can use partial applicaton functions easily like [[stream1, R.assoc('prop')], [stream2, R.evolve({count: R.inc})]]
  let updaters = R.concat(
    childUpdaters
  , R.map(R.apply((stream, fn) => [stream, (state, val) => {return fn(val, state)}]), component.updates)
  )

  // Wrap it in immediate because we want to emit the defaultState onto the stream as soon as the page loads
  let state$ = flyd.immediate(flyd_scanMerge(updaters, component.defaultState))

  // Finally, pair every state value on the state stream with the events object so your view function has access to the events
  return flyd.map(s => [component.events, s], state$)
}

module.exports = ui

