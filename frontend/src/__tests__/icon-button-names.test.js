import { describe, it, expect } from 'vitest'
import { parse } from 'espree'

const sources = import.meta.glob(['../**/*.jsx', '!../**/*.test.*', '!../**/__tests__/**'], {
  query: '?raw',
  import: 'default',
  eager: true,
})

const NAME_ATTRS = new Set(['aria-label', 'aria-labelledby', 'title'])

// True when the node renders (or may render) visible text, which gives the control a name.
function hasText(node) {
  if (!node) return false
  switch (node.type) {
    case 'JSXText':
      return node.value.trim() !== ''
    case 'JSXElement':
    case 'JSXFragment':
      return node.children.some(hasText)
    case 'JSXExpressionContainer':
      return hasText(node.expression)
    case 'JSXEmptyExpression':
      return false
    case 'ConditionalExpression':
      return hasText(node.consequent) || hasText(node.alternate)
    case 'LogicalExpression':
      return hasText(node.right)
    case 'Literal':
      return typeof node.value === 'string' && node.value.trim() !== ''
    default:
      // identifiers, calls, templates, member access... assume they render text
      return true
  }
}

function findIconOnlyButtons(code) {
  const ast = parse(code, {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
    loc: true,
  })
  const found = []
  const visit = (node) => {
    if (!node || typeof node.type !== 'string') return
    if (node.type === 'JSXElement') {
      const name = node.openingElement.name
      const tag = name.type === 'JSXIdentifier' ? name.name : null
      if (tag === 'button' || tag === 'Button') {
        const attrs = node.openingElement.attributes
        const named = attrs.some(
          (a) => a.type === 'JSXSpreadAttribute' || NAME_ATTRS.has(a.name?.name)
        )
        if (!named && !node.children.some(hasText)) found.push(node.loc.start.line)
      }
    }
    for (const key of Object.keys(node)) {
      const value = node[key]
      if (Array.isArray(value)) value.forEach(visit)
      else if (value && typeof value === 'object') visit(value)
    }
  }
  visit(ast)
  return found
}

describe('icon-only buttons (#349)', () => {
  it('every icon-only button has an accessible name', () => {
    const offenders = []
    for (const [file, content] of Object.entries(sources)) {
      for (const line of findIconOnlyButtons(content)) {
        offenders.push(`${file.replace('../', 'src/')}:${line}`)
      }
    }
    expect(offenders).toEqual([])
  })
})
