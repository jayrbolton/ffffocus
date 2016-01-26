import moment from 'moment'
import 'moment-duration-format'

module.exports = minutes =>
  moment.duration(minutes, 'minutes').format("mm:ss", {trim: false})
