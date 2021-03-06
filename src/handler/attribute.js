import {PREVIOUS_VALUE} from '../constants'

export default class AttributeHandler {
  constructor(fn, name) {
    this.fn = fn
    switch (name) {
    case 'class':
      this.name = 'className'
      break
    default:
      this.name = name
    }
  }

  *update(node, data, _, component) {
    const value = this.fn.apply(component, data)

    if (value === undefined || value === null) {
      if (typeof node[PREVIOUS_VALUE] === 'object') {
        this.executeCallback(node, data)
      } else {
        if (this.name in node) {
          node[this.name] = null
        } else {
          node.removeAttribute(this.name)
        }
      }
    } else if (typeof value === 'object') {
      this.executeCallback(node, data)
    } else {
      if (this.name in node) {
        node[this.name] = value
      } else {
        if (node.getAttribute(this.name) !== value) {
          node.setAttribute(this.name, value)
        }
      }
    }

    node[PREVIOUS_VALUE] = value
  }

  executeCallback(node, value) {
    if (node.attributeChangedCallback === undefined) {
      return
    }

    // TODO: cache observedAttributes?
    const observedAttributes = node.constructor.observedAttributes
    if (observedAttributes !== undefined && observedAttributes.indexOf(this.name) > -1) {
      node.attributeChangedCallback(this.name, node[PREVIOUS_VALUE], value)
    }
  }
}