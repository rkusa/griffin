export {
  parseTemplate,
  upgrade
} from './parse'

import importNodeWithData from './import'
export {importNodeWithData}

import {render as renderGen, updateNode} from './render'
export function renderTemplate(component) {
  const gen = renderGen(component)
  while (!gen.next().done) {}
}

export function update(node, self, data) {
  const gen = updateNode(node, [data], undefined, self)
  while (!gen.next().done) {}
}
