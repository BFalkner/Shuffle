export type Pip = 'M' | 'OH' | 'P' | 'OHt' | 'OHb'

export const PIP_CLASS: Record<Pip, string> = { M: 'mash', OH: 'overhand', P: 'pile', OHt: 'ohr', OHb: 'ohb' }
const PIP_NAME: Record<Pip, string> = { M: 'mash', OH: 'overhand', P: 'pile', OHt: 'half overhand of the top half', OHb: 'half overhand of the bottom half' }

/** A routine as a row of move pips, like the simulator's move strip. Repeats of one move share a pip with a count. */
export default function Cost({ moves }: { moves: [Pip, number][] }) {
  const label = moves.map(([pip, count]) => (count > 1 ? `${count} × ${PIP_NAME[pip]}` : PIP_NAME[pip])).join(', then ')
  return (
    <span className="cost" role="img" aria-label={label}>
      {moves.map(([pip, count], index) => (
        <span key={index} className="cost-group">
          <span className={`pip ${PIP_CLASS[pip]}`}>{pip}</span>
          {count > 1 && <span className="cost-count">×{count}</span>}
        </span>
      ))}
    </span>
  )
}
