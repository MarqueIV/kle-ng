import { describe, it, expect } from 'vitest'
import { SvgLayoutRenderer } from '../SvgLayoutRenderer'
import type { LayoutRenderInput } from '../LayoutRendererTypes'

const makeInput = (overrides: Partial<LayoutRenderInput> = {}): LayoutRenderInput => ({
  layoutName: 'Test Board',
  author: 'Jane Doe',
  backColor: '#cccccc',
  radiiValue: '8px',
  unit: 54,
  boardWidth: 162,
  boardHeight: 54,
  keys: [
    {
      left: 0,
      top: 0,
      width: 54,
      height: 54,
      topLeftLabel: 'A',
      bottomLeftLabel: '',
      darkColor: '#cccccc',
      lightColor: '#f0f0f0',
    },
    {
      left: 54,
      top: 0,
      width: 54,
      height: 54,
      topLeftLabel: 'B',
      bottomLeftLabel: 'fn',
      darkColor: '#aaaaaa',
      lightColor: '#dddddd',
    },
    {
      left: 108,
      top: 0,
      width: 54,
      height: 54,
      topLeftLabel: '',
      bottomLeftLabel: '',
      darkColor: '#cccccc',
      lightColor: '#f0f0f0',
    },
  ],
  ...overrides,
})

describe('SvgLayoutRenderer', () => {
  const renderer = new SvgLayoutRenderer()

  it('output starts with <?xml declaration', () => {
    const svg = renderer.render(makeInput())
    expect(svg.trimStart()).toMatch(/^<\?xml/)
  })

  it('contains an <svg> element with correct dimensions', () => {
    const svg = renderer.render(makeInput())
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"')
    expect(svg).toContain('width="162" height="54"')
    expect(svg).toContain('viewBox="0 0 162 54"')
  })

  it('contains <title> with the layout name', () => {
    const svg = renderer.render(makeInput({ layoutName: 'My Board' }))
    expect(svg).toContain('<title>My Board</title>')
  })

  it('escapes HTML special chars in <title>', () => {
    const svg = renderer.render(makeInput({ layoutName: '<script>alert(1)</script>' }))
    expect(svg).toContain('&lt;script&gt;')
    expect(svg).not.toContain('<script>alert(1)</script>')
  })

  it('renders board background <rect> with backColor and parsed rx', () => {
    const svg = renderer.render(makeInput())
    // radiiValue '8px' → rx="8"
    expect(svg).toContain('fill="#cccccc"')
    expect(svg).toContain('rx="8"')
    expect(svg).toContain(`width="162" height="54" fill="#cccccc" rx="8"`)
  })

  it('renders one <g> per key', () => {
    const svg = renderer.render(makeInput())
    const groupCount = (svg.match(/<g>/g) ?? []).length
    expect(groupCount).toBe(3)
  })

  it('each key group has an outer rect with darkColor and black stroke', () => {
    const svg = renderer.render(makeInput())
    expect(svg).toContain('fill="#cccccc" stroke="#000000" stroke-width="1"')
    expect(svg).toContain('fill="#aaaaaa" stroke="#000000" stroke-width="1"')
  })

  it('each key group has an inner rect with lightColor', () => {
    const svg = renderer.render(makeInput())
    expect(svg).toContain('fill="#f0f0f0" rx="3"')
    expect(svg).toContain('fill="#dddddd" rx="3"')
  })

  it('renders outer rect with 0.5px offset for crisp borders', () => {
    // Key at left=0: outer rect x should be 0.5
    const svg = renderer.render(makeInput())
    expect(svg).toContain('x="0.5" y="0.5"')
  })

  it('renders inner rect with correct bevel offsets (left+6, top+3, width-12, height-12)', () => {
    // Key at left=0, top=0, width=54, height=54:
    // inner: x=6, y=3, width=42, height=42
    const svg = renderer.render(makeInput())
    expect(svg).toContain('x="6" y="3" width="42" height="42"')
  })

  it('renders <text> for non-empty topLeftLabel', () => {
    const svg = renderer.render(makeInput())
    expect(svg).toContain('>A<')
    expect(svg).toContain('>B<')
  })

  it('renders <text> for non-empty bottomLeftLabel', () => {
    const svg = renderer.render(makeInput())
    expect(svg).toContain('>fn<')
  })

  it('omits <text> for empty labels', () => {
    const input = makeInput({
      keys: [
        {
          left: 0,
          top: 0,
          width: 54,
          height: 54,
          topLeftLabel: '',
          bottomLeftLabel: '',
          darkColor: '#cccccc',
          lightColor: '#f0f0f0',
        },
      ],
    })
    const svg = renderer.render(input)
    expect(svg).not.toContain('<text')
  })

  it('handles empty keys array gracefully', () => {
    const svg = renderer.render(makeInput({ keys: [] }))
    expect(svg).toContain('<svg')
    expect(svg).not.toContain('<g>')
  })

  it('parses leading integer from radiiValue for board rx', () => {
    const svg = renderer.render(makeInput({ radiiValue: '12px' }))
    expect(svg).toContain('rx="12"')
  })

  it('falls back to rx=0 when radiiValue is not parseable', () => {
    const svg = renderer.render(makeInput({ radiiValue: 'round' }))
    expect(svg).toContain('rx="0"')
  })
})
