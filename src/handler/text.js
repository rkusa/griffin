export default class TextHandler {
  constructor(fn) {
    this.fn = fn
  }

  *update(node, data, _, component) {
    const newTextContent = this.fn.apply(component, data)
    if (node.textContent !== newTextContent) {
      node.textContent = newTextContent
    }
  }
}