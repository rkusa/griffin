// NOTE: only a temporary solution, since it does not work for non-closing }
const REGEX_VAR = /\$\{([^\}]*)\}/g

export function parseExpression(str, argNames) {
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
    // TODO: naive implementation, don't care about IE11 enough

    let code = `'`
    let pos = 0

    let match
    while (match = REGEX_VAR.exec(str)) {
      if (match.index > pos) {
        code += str.slice(pos, match.index).replace(/\\'/g, "\\'").replace(/\n/g, '\\n')
      }
      code += `' + (${match[1]}) + '`
      pos = match.index + match[0].length
    }

    if (pos <= str.length - 1) {
      code += str.slice(pos).replace(/\\'/g, "\\'").replace(/\n/g, '\\n')
    }

    code += `'`

    return Reflect.construct(Function, argNames.concat(`return ${code}`))
  }
}

export function processTemplate(template) {
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