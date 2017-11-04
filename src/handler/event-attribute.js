import {PREVIOUS_EVENT_HANDLER} from '../constants'

export default class EventAttributeHandler {
  constructor(attrName, fn) {
    this.attrName = attrName
    this.eventName = attrName.slice(3)
    this.fn = fn
  }

  *update(node, data, parent, component) {
    if (!node[PREVIOUS_EVENT_HANDLER]) {
      // const fn = component[this.fnName]
      // if (typeof fn === 'function') {
        node.addEventListener(this.eventName, e => {
          node[PREVIOUS_EVENT_HANDLER](e)
        })
      // }
      // node.setAttribute(this.attrName, '')
      node.removeAttribute(this.attrName)
    }

    // TODO: only execute if changed?
    node[PREVIOUS_EVENT_HANDLER] = this.fn.apply(component, data)
  }
}