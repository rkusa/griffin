var griffin = (function (exports) {
'use strict';

const HANDLERS = new WeakMap();

function addHandler(node, handler) {
  const handlers = HANDLERS.get(node) || [];
  handlers.push(handler);
  HANDLERS.set(node, handlers);
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
    const next = handler.update(node, data, parent, component);
    if (next) {
      yield* next;
    } else {
      console.warn('Unimplemented else');
    }
  }

  return true
}

var handlers = {
  add: addHandler,
  get: getHandler,
  set: setHandler,
  has: hasHandler,
};

const START_COMMENT          = Symbol('~{');
const END_COMMENT            = Symbol('}~');
const PREVIOUS_VALUE         = Symbol('PREVIOUS_VALUE');
const PREVIOUS_EVENT_HANDLER = Symbol('PREVIOUS_EVENT_HANDLER');
const BOOLEAN_ATTRS          = new Set(['disabled', 'checked', 'selected', 'hidden', 'readonly']);

class AttributeHandler {
  constructor(fn, name) {
    this.fn = fn;
    switch (name) {
    case 'class':
      this.name = 'className';
      break
    default:
      this.name = name;
    }
  }

  *update(node, data, _, component) {
    const value = this.fn.apply(component, data);

    if (value === undefined || value === null) {
      if (typeof node[PREVIOUS_VALUE] === 'object') {
        this.executeCallback(node, data);
      } else {
        node.removeAttribute(this.name);
      }
    } else if (typeof value === 'object') {
      this.executeCallback(node, data);
    } else {
      if (this.name in node) {
        if (node[this.name] !== value) {
          node[this.name] = value;
        }
      } else {
        if (node.getAttribute(this.name) !== value) {
          node.setAttribute(this.name, value);
        }
      }
    }

    node[PREVIOUS_VALUE] = value;
  }

  executeCallback(node, value) {
    if (node.attributeChangedCallback === undefined) {
      return
    }

    // TODO: cache observedAttributes?
    const observedAttributes = node.constructor.observedAttributes;
    if (observedAttributes !== undefined && observedAttributes.indexOf(this.name) > -1) {
      node.attributeChangedCallback(this.name, node[PREVIOUS_VALUE], value);
    }
  }
}

class BooleanAttributeHandler extends AttributeHandler {
  *update(node, data, _, component) {
    node[this.name] = Boolean(this.fn.apply(component, data));
  }
}

class EventAttributeHandler {
  constructor(attrName, fn) {
    this.attrName = attrName;
    this.eventName = attrName.slice(3);
    this.fn = fn;
  }

  *update(node, data, parent, component) {
    if (!node[PREVIOUS_EVENT_HANDLER]) {
      // const fn = component[this.fnName]
      // if (typeof fn === 'function') {
        node.addEventListener(this.eventName, e => {
          node[PREVIOUS_EVENT_HANDLER](e);
        });
      // }
      // node.setAttribute(this.attrName, '')
      node.removeAttribute(this.attrName);
    }

    // TODO: only execute if changed?
    node[PREVIOUS_EVENT_HANDLER] = this.fn.apply(component, data);
  }
}

function render(component) {
  return updateNode(component.shadowRoot, component.state, null, component)
}

function* updateNode(node, data, parent, component, from, to) {
  if (hasHandler(node) && !from && !to) {
    const cont = yield *executeCallbacks(node, parent, data, component);
    yield true;

    if (!cont) {
      // data unchanged, skip children
      // console.log('data unchanged, skip children')
      return
    }
  }

  if (node.childNodes.length) {
    let child = from || node.firstChild;
    let skipping = 0;
    while (child && child !== to) {
      if (child.nodeType === Node.COMMENT_NODE) {
        switch (child.textContent) {
        case '~{':
          skipping++;
          child = child.nextSibling;
          continue
        case '}~':
          skipping--;
          child = child.nextSibling;
          continue
        }
      }

      if (skipping > 0) {
        child = child.nextSibling;
        continue
      }

      yield* updateNode(child, data, node, component);

      child = child.nextSibling;
    }
  }
}

function* executeCallbacks$1(node, parent, data, component) {
  for (const handler of handlers.get(node)) {
    const next = handler.update(node, data, parent, component);
    if (next) {
      yield* next;
    } else {
      console.warn('Unimplemented else');
    }
  }

  return true
}

function importNodeWithData(node, data, component) {
  // TODO: this leads to Out of stack error (in IE)
  // if (node && node.localName === 'template' && node.dataset.griffin) {
  //   return document.createComment(node.dataset.griffin)
  // }

  const clone = document.importNode(node, false);

  for (let child = node.firstChild; child; child = child.nextSibling) {
    const newChild = importNodeWithData(child, data, component);

    clone.appendChild(newChild);

    // execute after child has been added
    if (handlers.has(child)) {
      handlers.set(newChild, handlers.get(child));
      const gen = executeCallbacks$1(newChild, clone, data, component);
      while (!gen.next().done) {}
    }
  }

  return clone
}

function parseExpression(str, argNames) {
  if (!str) {
    return null
  }

  const ix = str.indexOf('${');
  if (ix === -1) {
    return null
  }

  // whole expression is JavaScript
  if (ix === 0 && str.indexOf('${', ix + 1) === -1 && str[str.length - 1] === '}') {
    return Reflect.construct(Function, argNames.concat(`return ${str.substr(2, str.length - 3)}`))
  } else {
    return Reflect.construct(Function, argNames.concat(`return \`${str}\``))
  }
}



function insertAfter(newEl, afterEl) {
  const parent = afterEl.parentNode;
  if (parent.lastChild === afterEl) {
    parent.appendChild(newEl);
  } else {
    parent.insertBefore(newEl, afterEl.nextSibling);
  }
}

class IfHandler {
  constructor(fn, template) {
    this.fn = fn;
    this.template = template;
  }

  *update(node, data, parent, component) {
    const startComment = node[START_COMMENT] || (node[START_COMMENT] = document.createComment('~{'));
    const endComment   = node[END_COMMENT]   || (node[END_COMMENT]   = document.createComment('}~'));

    const shouldRender = this.fn.apply(component, data);
    if (!shouldRender && startComment.nextSibling === endComment) {
      // should not render, and there is nothing rendered currently, stop here
      return
    }

    let offset = 0;

    if (!startComment.parentNode) {
      insertAfter(endComment, node);
      offset = parent.childNodes.length;
      insertAfter(startComment, node);
    } else {
      for (const len = parent.childNodes.length; offset < len; ++offset) {
        if (parent.childNodes[offset] === startComment) {
          offset++;
          break
        }
      }
    }

    if (shouldRender) {
      if (startComment.nextSibling === endComment) {
        const clone = importNodeWithData(this.template.content, data, component);
        parent.insertBefore(clone, endComment);
      } else {
        let el = parent.childNodes[offset];
        while (el) {
          if (el === endComment) {
            yield* updateNode(parent, data, parent, component, parent.childNodes[offset], el);
            break
          }

          el = el.nextSibling;
        }
      }
    } else {
      // remove all between start and end
      while (startComment.nextSibling && startComment.nextSibling !== endComment) {
        parent.removeChild(startComment.nextSibling);
      }
    }
  }
}

class RepeatHandler {
  constructor(fn, template) {
    this.fn = fn;
    this.template = template;
  }

  *update(node, data, parent, component) {
    const startComment = node[START_COMMENT] || (node[START_COMMENT] = document.createComment('~{'));
    const endComment   = node[END_COMMENT]   || (node[END_COMMENT]   = document.createComment('}~'));

    let offset = 0;

    if (!startComment.parentNode) {
      insertAfter(endComment, node);
      offset = parent.childNodes.length;
      insertAfter(startComment, node);
    } else {
      for (const len = parent.childNodes.length; offset < len; ++offset) {
        if (parent.childNodes[offset] === startComment) {
          offset++;
          break
        }
      }
    }

    let dataOffset = 0;
    let array = this.fn.apply(component, data);

    // if there is already some content rendered for the repeat, update them
    if (startComment.nextSibling !== endComment) {
      if (!Array.isArray(array)) {
        // remove all between start and end
        while (startComment.nextSibling && startComment.nextSibling !== endComment) {
          parent.removeChild(startComment.nextSibling);
        }
      } else {
        // update
        const dataLastIndex = array.length - 1;
        let el = parent.childNodes[offset];
        let from = el;
        while (el) {
          if (dataOffset > dataLastIndex) {
            while (el && el !== endComment) {
              const del = el;
              el = el.nextSibling;
              parent.removeChild(del);
            }

            break
          }

          if (el === endComment || el.nodeType === Node.COMMENT_NODE && el.textContent === '~~~') {
            yield* updateNode(parent, data.concat(array[dataOffset++]), parent, component,
              from, // from
              el // to
            );
            from = el.nextSibling;
          }

          if (el === endComment) {
            break
          }

          el = el.nextSibling;
        }
      }
    }

    if (Array.isArray(array)) {
      for (let i = dataOffset, len = array.length; i < len; ++i) {
        if (i > 0) {
          parent.insertBefore(document.createComment('~~~', endComment), endComment);
        }
        const item = array[i];

        // TODO: render
        const clone = importNodeWithData(this.template.content, data.concat(item), component);
        parent.insertBefore(clone, endComment);
      }
    }
  }
}

class TextHandler {
  constructor(fn) {
    this.fn = fn;
  }

  *update(node, data, _, component) {
    const newTextContent = this.fn.apply(component, data);
    if (node.textContent !== newTextContent) {
      node.textContent = newTextContent;
    }
  }
}

class HtmlHandler {
  constructor(fn) {
    this.fn = fn;
    // required for IE12
    this.anchor = document.createComment('#');
  }

  *update(node, data, parent, component) {
    const startComment = node[START_COMMENT] || (node[START_COMMENT] = document.createComment('~{'));
    const endComment   = node[END_COMMENT]   || (node[END_COMMENT]   = document.createComment('}~'));

    if (!startComment.parentNode) {
      insertAfter(endComment, node);
      insertAfter(startComment, node);
    } else {
      
    }

    // TODO: implement update
    // remove all between start and end
    while (startComment.nextSibling && startComment.nextSibling !== endComment) {
      parent.removeChild(startComment.nextSibling);
    }

    const newHtmlContent = this.fn.apply(component, data);
    const tmp = document.createElement('div');
    tmp.innerHTML = newHtmlContent;

    while (tmp.firstChild) {
      parent.insertBefore(tmp.firstChild, endComment);
    }
  }
}

class WithHandler {
  constructor(fn, template) {
    this.fn = fn;
    this.template = template;
  }

  *update(node, data, parent, component) {
    const startComment = node[START_COMMENT] || (node[START_COMMENT] = document.createComment('~{'));
    const endComment   = node[END_COMMENT]   || (node[END_COMMENT]   = document.createComment('}~'));

    let offset = 0;

    if (!startComment.parentNode) {
      insertAfter(endComment, node);
      offset = parent.childNodes.length;
      insertAfter(startComment, node);
    } else {
      for (const len = parent.childNodes.length; offset < len; ++offset) {
        if (parent.childNodes[offset] === startComment) {
          offset++;
          break
        }
      }
    }

    let withValue = this.fn.apply(component, data);

    if (startComment.nextSibling === endComment) {
      const clone = importNodeWithData(this.template.content, data.concat(withValue), component);
      parent.insertBefore(clone, endComment);
    } else {
      let el = parent.childNodes[offset];
      while (el) {
        if (el === endComment) {
          yield* updateNode(parent, data.concat(withValue), parent, component, parent.childNodes[offset], el);
          break
        }

        el = el.nextSibling;
      }
    }
  }
}

function traverseElement(el, argNames) {
  for (let child = el.firstChild; child; child = child.nextSibling) {
    switch (child.nodeType) {
    case Node.ELEMENT_NODE:
      // <template>
      if (child && child.localName === 'template') {
        if (child.hasAttribute('repeat')) {
          const itemName = child.getAttribute('as') || 'item';
          const fn = parseExpression(child.getAttribute('repeat'), argNames);
          traverseElement(child.content, argNames.concat(itemName));

          const handler = new RepeatHandler(fn, child);
          addHandler(child, handler);

          child.removeAttribute('repeat');
          child.removeAttribute('as');
          child.dataset.griffin = 'repeat';
        }
        // <template if="...">
        else if (child.hasAttribute('if')) {
          const fn = parseExpression(child.getAttribute('if'), argNames);
          traverseElement(child.content, argNames);

          const handler = new IfHandler(fn, child);
          addHandler(child, handler);

          child.removeAttribute('if');
          child.dataset.griffin = 'if';
        }
        // <template with="...">
        else if (child.hasAttribute('with')) {
          const alias = child.getAttribute('as') || 'item';
          const fn = parseExpression(child.getAttribute('with'), argNames);
          traverseElement(child.content, argNames.concat(alias));

          const handler = new WithHandler(fn, child);
          addHandler(child, handler);

          child.removeAttribute('with');
          child.removeAttribute('as');
          child.dataset.griffin = 'with';
        }

        break
      }

      // allow repeat for non-template elements (IE fallback)
      // TODO: hide behind option?
      if (child && child.localName === 'optgroup') {
        // <* repeat="...">
        if (child.hasAttribute('repeat')) {
          const itemName = child.getAttribute('as') || 'item';
          const fn = parseExpression(child.getAttribute('repeat'), argNames);

          const fragment = document.createDocumentFragment();
          while (child.childNodes[0]) {
            fragment.appendChild(child.childNodes[0]);
          }
          traverseElement(fragment, argNames.concat(itemName));

          const handler = new RepeatHandler(fn, { content: fragment });
          // const comment = document.createComment('repeat')
          addHandler(child, handler);
          // child.appendChild(comment)

          child.removeAttribute('repeat');
          child.removeAttribute('as');
        }
      }

      // attributes
      for (let i = child.attributes.length - 1; i >= 0; --i) {
        const attr = child.attributes[i];

        // check if it is a event attribute (e.g. on-click)
        if (attr.name[0] === 'o' && attr.name[1] === 'n' && attr.name[2] === '-') {
          const fn = Reflect.construct(Function, argNames.concat(`return ${attr.value}`));
          const handler = new EventAttributeHandler(attr.name, fn);
          addHandler(child, handler);

          child.removeAttribute(attr.name);

          continue
        }

        const fn = parseExpression(attr.value, argNames);
        if (fn) {
          // check if its is a boolean attribute (e.g. disabled, checked, ...)
          if (BOOLEAN_ATTRS.has(attr.name)) {
            const handler = new BooleanAttributeHandler(fn, attr.name);
            addHandler(child, handler);
          } else {
            const handler = new AttributeHandler(fn, attr.name);
            addHandler(child, handler);
          }

          child.removeAttribute(attr.name);
        }
      }

      // traverse child recursively
      traverseElement(child, argNames);
      child.removeAttribute('raw');

      break
    case Node.TEXT_NODE:
      const fn = parseExpression(child.textContent, argNames);
      if (fn) {
        if (el.hasAttribute && el.hasAttribute('raw')) {
          const handler = new HtmlHandler(fn);
          el.insertBefore(handler.anchor, child);
          addHandler(handler.anchor, handler);
        } else {
          const handler = new TextHandler(fn);
          addHandler(el.childNodes.length === 1 ? el : child, handler);
        }

        child.textContent = '';
      }

      break
    default:
      continue
    }
  }
}

// TODO: to be removed
function parseTemplate(template) {
  upgrade(template);
}

function upgrade(node, opts) {
  if (node.localName === 'template') {
    node = node.content;
  }
  const rootName = opts && opts.rootName || 'locals';
  traverseElement(node, [rootName]);
}

function renderTemplate(component) {
  const gen = render(component);
  while (!gen.next().done) {}
}

function update(node, self, data) {
  const gen = updateNode(node, [data], undefined, self);
  while (!gen.next().done) {}
}

exports.importNodeWithData = importNodeWithData;
exports.renderTemplate = renderTemplate;
exports.update = update;
exports.parseTemplate = parseTemplate;
exports.upgrade = upgrade;

return exports;

}({}));
