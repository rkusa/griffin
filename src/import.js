import handlers from './handlers'

function* executeCallbacks(node, parent, data, component) {
  for (const handler of handlers.get(node)) {
    const next = handler.update(node, data, parent, component)
    if (next) {
      yield* next
    } else {
      console.warn('Unimplemented else')
    }
  }

  return true
}

export default function importNodeWithData(node, data, component) {
  // TODO: this leads to Out of stack error (in IE)
  // if (node && node.localName === 'template' && node.dataset.griffin) {
  //   return document.createComment(node.dataset.griffin)
  // }

  const clone = document.importNode(node, false)

  for (let child = node.firstChild; child; child = child.nextSibling) {
    const newChild = importNodeWithData(child, data, component)

    clone.appendChild(newChild)

    // execute after child has been added
    if (handlers.has(child)) {
      handlers.set(newChild, handlers.get(child))
      const gen = executeCallbacks(newChild, clone, data, component)
      for (const _ of gen) {}
    }
  }

  return clone
}
