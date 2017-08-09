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
    return Reflect.construct(Function, argNames.concat(`return \`${str}\``))
  }
}

export function processTemplate(template) {
  // noop
}