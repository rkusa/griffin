export {
  parseTemplate,
  upgrade
} from './parse'
// import parseTemplate from './parse'
// window.parseTemplate = parseTemplate

export {
  importNodeWithData
} from './import'
// import importNodeWithData from './import'
// window.importNodeWithData = importNodeWithData

import {render as renderGen, updateNode} from './render'
export function renderTemplate(component) {
  for (const _ of renderGen(component)) {
  }
}
// window.renderTemplate = function(component) {
//   for (const _ of renderGen(component)) {
//   }
// }
// window.updateNode = updateNode

export function update(node, self, data) {
  for (const _ of updateNode(node, [data], undefined, self)) {
  }
}
