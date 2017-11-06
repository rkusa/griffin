import {add as addHandler} from './handlers'
import {BOOLEAN_ATTRS} from './constants'
import AttributeHandler from './handler/attribute'
import BooleanAttributeHandler from './handler/boolean-attribute'
import EventAttributeHandler from './handler/event-attribute'
import IfHandler from './handler/if'
import RepeatHandler from './handler/repeat'
import TextHandler from './handler/text'
import HtmlHandler from './handler/html'
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
          child.dataset.griffin = 'repeat'
        }
        // <template if="...">
        else if (child.hasAttribute('if')) {
          const fn = parseExpression(child.getAttribute('if'), argNames)
          traverseElement(child.content, argNames)

          const handler = new IfHandler(fn, child)
          addHandler(child, handler)

          child.removeAttribute('if')
          child.dataset.griffin = 'if'
        }
        // <template with="...">
        else if (child.hasAttribute('with')) {
          const alias = child.getAttribute('as') || 'item'
          const fn = parseExpression(child.getAttribute('with'), argNames)
          traverseElement(child.content, argNames.concat(alias))

          const handler = new WithHandler(fn, child)
          addHandler(child, handler)

          child.removeAttribute('with')
          child.removeAttribute('as')
          child.dataset.griffin = 'with'
        }

        break
      }

      // allow repeat for non-template elements (IE fallback)
      // TODO: hide behind option?
      if (child && child.localName === 'optgroup') {
        // <* repeat="...">
        if (child.hasAttribute('repeat')) {
          const itemName = child.getAttribute('as') || 'item'
          const fn = parseExpression(child.getAttribute('repeat'), argNames)

          const fragment = document.createDocumentFragment()
          while (child.childNodes[0]) {
            fragment.appendChild(child.childNodes[0])
          }
          traverseElement(fragment, argNames.concat(itemName))

          const handler = new RepeatHandler(fn, { content: fragment })
          // const comment = document.createComment('repeat')
          addHandler(child, handler)
          // child.appendChild(comment)

          child.removeAttribute('repeat')
          child.removeAttribute('as')
        }
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
      child.removeAttribute('raw')

      break
    case Node.TEXT_NODE:
      const fn = parseExpression(child.textContent, argNames)
      if (fn) {
        if (el.hasAttribute && el.hasAttribute('raw')) {
          const handler = new HtmlHandler(fn)
          el.insertBefore(handler.anchor, child)
          addHandler(handler.anchor, handler)
        } else {
          const handler = new TextHandler(fn)
          addHandler(el.childNodes.length === 1 ? el : child, handler)
        }

        child.textContent = ''
      }

      break
    default:
      continue
    }
  }
}

// TODO: to be removed
export function parseTemplate(template) {
  upgrade(template)
}

export function upgrade(node, opts) {
  if (node.localName === 'template') {
    processTemplate(template)
    node = template.content
  }
  const rootName = opts && opts.rootName || 'locals'
  traverseElement(node, [rootName])
}