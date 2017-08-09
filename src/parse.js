import {add as addHandler} from './handlers'
import {BOOLEAN_ATTRS} from './constants'
import AttributeHandler from './handler/attribute'
import BooleanAttributeHandler from './handler/boolean-attribute'
import EventAttributeHandler from './handler/event-attribute'
import IfHandler from './handler/if'
import RepeatHandler from './handler/repeat'
import TextHandler from './handler/text'
import WithHandler from './handler/with'
import {parseExpression, processTemplate} from './utils'

function traverseElement(el, argNames) {
  for (let child = el.firstChild; child; child = child.nextSibling) {
    switch (child.nodeType) {
    case Node.ELEMENT_NODE:
      // <template>
      if (child && child.localName === 'template') {
        processTemplate(child)

        // <template repeat="...">
        if (child.hasAttribute('repeat')) {
          const itemName = child.getAttribute('as') || 'item'
          const fn = parseExpression(child.getAttribute('repeat'), argNames)
          traverseElement(child.content, argNames.concat(itemName))

          const handler = new RepeatHandler(fn, child)
          addHandler(child, handler)

          child.removeAttribute('repeat')
          child.removeAttribute('as')
        }
        // <template if="...">
        else if (child.hasAttribute('if')) {
          const fn = parseExpression(child.getAttribute('if'), argNames)
          traverseElement(child.content, argNames)

          const handler = new IfHandler(fn, child)
          addHandler(child, handler)

          child.removeAttribute('if')
        }
        // <template if="...">
        else if (child.hasAttribute('with')) {
          const alias = child.getAttribute('as') || 'item'
          const fn = parseExpression(child.getAttribute('with'), argNames)
          traverseElement(child.content, argNames.concat(alias))

          const handler = new WithHandler(fn, child)
          addHandler(child, handler)

          child.removeAttribute('with')
          child.removeAttribute('as')
        }

        break
      }

      // attributes
      for (let i = child.attributes.length - 1; i >= 0; --i) {
        const attr = child.attributes[i]

        // check if it is a event attribute (e.g. on-click)
        if (attr.name[0] === 'o' && attr.name[1] === 'n' && attr.name[2] === '-') {
          const fn = Reflect.construct(Function, argNames.concat(`return ${attr.value}`))
          const handler = new EventAttributeHandler(attr.name, fn)
          addHandler(child, handler)

          child.removeAttribute(attr.name)

          continue
        }

        const fn = parseExpression(attr.value, argNames)
        if (fn) {
          // check if its is a boolean attribute (e.g. disabled, checked, ...)
          if (BOOLEAN_ATTRS.has(attr.name)) {
            const handler = new BooleanAttributeHandler(fn, attr.name)
            addHandler(child, handler)
          } else {
            const handler = new AttributeHandler(fn, attr.name)
            addHandler(child, handler)
          }

          child.removeAttribute(attr.name)
        }
      }

      // traverse child recursively
      traverseElement(child, argNames)

      break
    case Node.TEXT_NODE:
      const fn = parseExpression(child.textContent, argNames)
      if (fn) {
        const handler = new TextHandler(fn)
        addHandler(child, handler)
      }

      break
    default:
      continue
    }
  }
}

export default function parseTemplate(template) {
  processTemplate(template)
  traverseElement(template.content, ['locals'])
}
