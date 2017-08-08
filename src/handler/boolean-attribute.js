import AttributeHandler from './attribute'

export default class BooleanAttributeHandler extends AttributeHandler {
  *update(node, data, _, component) {
    node[this.name] = Boolean(this.fn.apply(component, data))
  }
}