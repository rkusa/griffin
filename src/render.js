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
    const len = from || to ? to - from : node.childNodes.length
    const offset = from || 0
    let skipping = 0
    for (let i = 0; i < len; ++i) {
      const child = node.childNodes[i + offset]
      if (!child) {
        break
      }

      if (child.nodeType === Node.COMMENT_NODE) {
        switch (child.textContent) {
        case '~{':
          skipping++
          continue
        case '}~':
          skipping--
          continue
        }
      }

      if (skipping > 0) {
        continue
      }

      yield* updateNode(child, data, node, component)
    }
  }
}
