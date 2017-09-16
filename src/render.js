import {has as hasHandler, executeCallbacks} from './handlers'

export function render(component) {
  return updateNode(component.shadowRoot, component.state, null, component)
}

export function* updateNode(node, data, parent, component, from, to) {
  if (hasHandler(node) && !from && !to) {
    const cont = yield *executeCallbacks(node, parent, data, component)
    yield true

    if (!cont) {
      // data unchanged, skip children
      // console.log('data unchanged, skip children')
      return
    }
  }

  if (node.childNodes.length) {
    let child = from || node.firstChild
    let skipping = 0
    while (child && child !== to) {
      if (child.nodeType === Node.COMMENT_NODE) {
        switch (child.textContent) {
        case '~{':
          skipping++
          child = child.nextSibling
          continue
        case '}~':
          skipping--
          child = child.nextSibling
          continue
        }
      }

      if (skipping > 0) {
        child = child.nextSibling
        continue
      }

      yield* updateNode(child, data, node, component)

      child = child.nextSibling
    }
  }
}
