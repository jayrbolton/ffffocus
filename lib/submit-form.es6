import R from 'ramda'
import formSerialize from 'form-serialize'

// Given some default data, a transformation object (see ramda/evolve), and a form submit event:
// - preventDefault on the form submit
// - serialize the form data and reset the form
// - apply transformations and defaults to the form data


module.exports = R.curryN(3, (defaults, transformations, ev) =>
  R.compose(
    R.evolve(transformations)
  , R.merge(defaults)
  , serializeReset
  , ev => {ev.preventDefault(); return ev.currentTarget}
  )(ev))

const serializeReset = form => {
  let data = formSerialize(form, {hash: true})
  form.reset()
  return data
}
