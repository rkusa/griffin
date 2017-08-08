const HANDLERS = new WeakMap()

export function addHandler(node, handler) {
  const handlers = HANDLERS.get(node) || []
  handlers.push(handler)
  HANDLERS.set(node, handlers)
}

function getHandler(node) {
  return HANDLERS.get(node)
}

function setHandler(node, handler) {
  return HANDLERS.set(node, handler)
}

function hasHandler(node) {
  return HANDLERS.has(node)
}

function* executeCallbacks(node, parent, data, component) {
  for (const handler of HANDLERS.get(node)) {
    const next = handler.update(node, data, parent, component)
    if (next) {
      yield* next
    } else {
      console.warn('Unimplemented else')
    }
  }

  return true
}

export {
  addHandler as add,
  getHandler as get,
  setHandler as set,
  hasHandler as has,
  executeCallbacks
}

export default {
  add: addHandler,
  get: getHandler,
  set: setHandler,
  has: hasHandler,
}
