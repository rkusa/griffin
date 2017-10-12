import {START_COMMENT, END_COMMENT} from '../constants'
import {updateNode} from '../render'
import importNodeWithData from '../import'
import {insertAfter} from '../utils'

export default class RepeatHandler {
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

    let dataOffset = 0
    let array = this.fn.apply(component, data)

    // if there is already some content rendered for the repeat, update them
    if (startComment.nextSibling !== endComment) {
      if (!Array.isArray(array)) {
        // remove all between start and end
        while (startComment.nextSibling && startComment.nextSibling !== endComment) {
          parent.removeChild(startComment.nextSibling)
        }
      } else {
        // update
        const dataLastIndex = array.length - 1
        let el = parent.childNodes[offset]
        let from = el
        while (el) {
          if (dataOffset > dataLastIndex) {
            while (el && el !== endComment) {
              const del = el
              el = el.nextSibling
              parent.removeChild(del)
            }

            break
          }

          if (el === endComment || el.nodeType === Node.COMMENT_NODE && el.textContent === '~~~') {
            yield* updateNode(parent, data.concat(array[dataOffset++]), parent, component,
              from, // from
              el // to
            )
            from = el.nextSibling
          }

          if (el === endComment) {
            break
          }

          el = el.nextSibling
        }
      }
    }

    if (Array.isArray(array)) {
      for (let i = dataOffset, len = array.length; i < len; ++i) {
        if (i > 0) {
          parent.insertBefore(document.createComment('~~~', endComment), endComment)
        }
        const item = array[i]

        // TODO: render
        const clone = importNodeWithData(this.template.content, data.concat(item), component)
        parent.insertBefore(clone, endComment)
      }
    }
  }
}