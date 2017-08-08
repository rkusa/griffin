import {add as addHandler} from './handlers'
import {BOOLEAN_ATTRS} from './constants'
import AttributeHandler from './handler/attribute'
import BooleanAttributeHandler from './handler/boolean-attribute'
import EventAttributeHandler from './handler/event-attribute'
import IfHandler from './handler/if'
import RepeatHandler from './handler/repeat'
import TextHandler from './handler/text'
import WithHandler from './handler/with'

const REGEX_VAR = /{([a-zA-Z0-9]*)}/g


// function parseExpression(str) {
//   return new (Function.bind(Function, 'data', `return \`${str}\``))
// }

function parseExpression(str, argNames) {
  if (!str) {
    return null
  }

  const ix = str.indexOf('${')
  if (ix === -1) {
    return null
  }

  // whole expression is JavaScript
  if (ix === 0 && str.indexOf('${', ix + 1) === -1 && str[str.length - 1] === '}') {
    return Reflect.construct(Function, argNames.concat(`return ${str.substr(2, str.length - 3)}`))
  } else {
    return Reflect.construct(Function, argNames.concat(`return \`${str}\``))
  }


  // return

  // const parts = []
  // let pos = 0

  // let match
  // while (match = REGEX_VAR.exec(str)) {
  //   if (match.index > pos) {
  //     parts.push(str.slice(pos, match.index))
  //   }
  //   parts.push({ key: match[1] })
  //   pos = match.index + match[0].length
  // }

  // if (parts.length === 0) {
  //   return null
  // }

  // if (pos <= str.length - 1) {
  //   parts.push(str.slice(pos))
  // }

  // return function(data) {
  //   if (parts.length === 1) {
  //     const part = parts[0]
  //     return part.key === '' ? data : data[part.key]
  //   } else {
  //     let result = ''
  //     for (const part of parts) {
  //       if (typeof part === 'string') {
  //         result += part
  //       } else {
  //         const value = part.key === '' ? data : data[part.key]
  //         if (value !== undefined && value !== null) {
  //           result += value
  //         }
  //       }
  //     }
  //     return result
  //   }
  // }
}

function traverseElement(el, argNames) {
  for (let child = el.firstChild; child; child = child.nextSibling) {
    switch (child.nodeType) {
    case Node.ELEMENT_NODE:
      // <template>
      if (child && child.localName === 'template') {
        polyfillTemplate(child)

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
  polyfillTemplate(template)
  traverseElement(template.content, ['locals'])
}


function polyfillTemplate(template) {
  if (template.content) {
    return
  }

  const content = template.childNodes
  const fragment = document.createDocumentFragment()

  while (content[0]) {
    fragment.appendChild(content[0])
  }

  template.content = fragment
}
