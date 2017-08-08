import {START_COMMENT, END_COMMENT} from '../constants'
import {updateNode} from '../render'
import importNodeWithData from '../import'

export default class IfHandler {
  constructor(fn, template) {
    this.fn = fn
    this.template = template
  }

  *update(node, data, parent, component) {
    const startComment = node[START_COMMENT] || (node[START_COMMENT] = document.createComment('~{'))
    const endComment   = node[END_COMMENT]   || (node[END_COMMENT]   = document.createComment('}~'))

    const shouldRender = this.fn.apply(component, data)
    if (!shouldRender && startComment.nextSibling === endComment) {
      // should not render, and there is nothing rendered currently, stop here
      return
    }

    let offset = 0

    if (!startComment.parentNode) {
      parent.appendChild(startComment)
      offset = parent.childNodes.length
      parent.appendChild(endComment)
    } else {
      for (const len = parent.childNodes.length; offset < len; ++offset) {
        if (parent.childNodes[offset] === startComment) {
          offset++
          break
        }
      }
    }

    if (shouldRender) {
      if (startComment.nextSibling === endComment) {
        const clone = importNodeWithData(this.template.content, data, component)
        parent.insertBefore(clone, endComment)
      } else {
        for (let i = offset, len = parent.childNodes.length; i < len; ++i) {
          let el = parent.childNodes[i]

          if (el === endComment) {
            yield* updateNode(parent, data, parent, component, offset, i)
            break
          }
        }
      }
    } else {
      // remove all between start and end
      while (startComment.nextSibling && startComment.nextSibling !== endComment) {
        parent.removeChild(startComment.nextSibling)
      }
    }
  }
}
