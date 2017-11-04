import {START_COMMENT, END_COMMENT} from '../constants'
import {insertAfter} from '../utils'

export default class HtmlHandler {
  constructor(fn) {
    this.fn = fn
    // required for IE12
    this.anchor = document.createComment('#')
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

    // TODO: implement update
    // remove all between start and end
    while (startComment.nextSibling && startComment.nextSibling !== endComment) {
      parent.removeChild(startComment.nextSibling)
    }

    const newHtmlContent = this.fn.apply(component, data)
    const tmp = document.createElement('div')
    tmp.innerHTML = newHtmlContent

    while (tmp.firstChild) {
      parent.insertBefore(tmp.firstChild, endComment)
    }
  }
}
