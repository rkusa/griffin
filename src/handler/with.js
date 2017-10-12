import {START_COMMENT, END_COMMENT} from '../constants'
import {updateNode} from '../render'
import importNodeWithData from '../import'
import {insertAfter} from '../utils'

export default class WithHandler {
  constructor(fn, template) {
    this.fn = fn
    this.template = template
  }

  *update(node, data, parent, component) {
    const startComment = node[START_COMMENT] || (node[START_COMMENT] = document.createComment('~{'))
    const endComment   = node[END_COMMENT]   || (node[END_COMMENT]   = document.createComment('}~'))

    let offset = 0

    if (!startComment.parentNode) {
      insertAfter(endComment, node)
      offset = parent.childNodes.length
      insertAfter(startComment, node)
    } else {
      for (const len = parent.childNodes.length; offset < len; ++offset) {
        if (parent.childNodes[offset] === startComment) {
          offset++
          break
        }
      }
    }

    let withValue = this.fn.apply(component, data)

    if (startComment.nextSibling === endComment) {
      const clone = importNodeWithData(this.template.content, data.concat(withValue), component)
      parent.insertBefore(clone, endComment)
    } else {
      let el = parent.childNodes[offset]
      while (el) {
        if (el === endComment) {
          yield* updateNode(parent, data.concat(withValue), parent, component, parent.childNodes[offset], el)
          break
        }

        el = el.nextSibling
      }
    }
  }
}