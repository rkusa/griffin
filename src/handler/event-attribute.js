export default class EventAttributeHandler {
  constructor(attrName, fn) {
    this.attrName = attrName
    this.eventName = attrName.slice(3)
    this.fn = fn
  }

  *update(node, data, parent, component) {
    if (!node.hasAttribute(this.attrName)) {
      // const fn = component[this.fnName]
      // if (typeof fn === 'function') {
        node.addEventListener(this.eventName, e => {
          this.fn.apply(component, data)(e)
        })
      // }
      node.setAttribute(this.attrName, '')
    }
  }
}