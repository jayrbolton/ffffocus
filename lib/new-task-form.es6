import h from 'snabbdom/h'

module.exports = (submit$, placeholder) =>
  h('form.newTask.p2', {
    on: {submit: submit$}
  }, [
    h('input.bold.field.col-6', {props: {name: 'name', type: 'text', required: true, placeholder: placeholder}})
  , h('span.inline-block.col-1')
  , h('div.inline-block.col-2', [
      h('label.inline-block', 'Points: ')
    , ' '
    , h('input.field.col-8', {props: {name: 'points', type: 'number', value: 1, max: 5, min: 1}})
    ])
  , h('span.inline-block.col-1')
  , h('button.inline-block.btn.btn-primary', 'Add Task')
  ])
