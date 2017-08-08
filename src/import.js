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
  if (node && node.localName === 'template' && (node.hasAttribute('repeat') || node.hasAttribute('if'))) {
    const comment = node.hasAttribute('repeat') ? '~repeat~' : '~if~'
    return document.createComment(comment)
  }

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
