import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'

const run = (args: string) => {
  try {
    return { out: execSync(`npx tsx src/cli.ts ${args}`, { encoding: 'utf8', timeout: 30_000 }), code: 0 }
  } catch (e) {
    const err = e as { stdout?: string; status?: number }
    return { out: err.stdout ?? '', code: err.status ?? 1 }
  }
}

describe('solid-pod validate', () => {
  it('reports conforms=true for conforming data, exit 0', () => {
    const { out, code } = run('validate tests/fixtures/data-conforming.ttl --shape tests/fixtures/shape-concept.ttl')
    const r = JSON.parse(out)
    expect(r.conforms).toBe(true)
    expect(code).toBe(0)
  })

  it('reports the violation with focusNode, path, and message, exit 1', () => {
    const { out, code } = run('validate tests/fixtures/data-violating.ttl --shape tests/fixtures/shape-concept.ttl')
    const r = JSON.parse(out)
    expect(r.conforms).toBe(false)
    expect(code).toBe(1)
    expect(r.results.length).toBeGreaterThan(0)
    expect(r.results[0].focusNode).toBe('http://example.org/c2')
    expect(r.results[0].path).toBe('http://www.w3.org/2004/02/skos/core#prefLabel')
    expect(r.results[0].message[0]).toContain('prefLabel')
  })
})
