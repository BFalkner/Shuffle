import type { CSSProperties } from 'react'
import { Button, GridList, GridListItem, ToggleButton, useDragAndDrop, type Key } from 'react-aria-components'
import ConfirmButton from './ConfirmButton'
import { earlyDropTarget } from './dropTarget'
import type { DeckKind } from '../../engine/decks'
import { compressSeq } from '../../engine/routines'
import { fmtLevel } from '../../engine/scoring'
import { methodName, type Experiment } from './experiments'
import type { Scored } from './scorer'

export interface MethodRow {
  experiment: Experiment
  color: string
  /** the method's result from each starting deck, when scored (possibly for an earlier version of its moves) */
  totals: Record<DeckKind, Scored | undefined>
}

interface Props {
  rows: MethodRow[]
  kind: DeckKind
  activeId: string | undefined
  shownIds: string[]
  onActivate: (id: string) => void
  onShownChange: (ids: string[]) => void
  /** move these methods to just before or after the target method */
  onReorder: (ids: string[], targetId: string, position: 'before' | 'after') => void
  onNew: () => void
  onReset: () => void
}

const DECK_LABELS: Record<DeckKind, string> = { sorted: 'Sorted', played: 'Played' }

/**
 * Every saved method, in the order you arrange them. Activate a row to edit it, tick its box to draw it on the charts, and drag its handle to move it
 * next to the one being edited. Each row shows its total from both starting decks, so decks compare at a glance.
 */
export default function MethodList({ rows, kind, activeId, shownIds, onActivate, onShownChange, onReorder, onNew, onReset }: Props) {
  const toggleShown = (id: string) => onShownChange(shownIds.includes(id) ? shownIds.filter((shown) => shown !== id) : [...shownIds, id])
  const byId = new Map(rows.map((row) => [row.experiment.id, row.experiment]))
  // Drag a row by its handle (or pick it up with the keyboard) to reorder the list.
  const { dragAndDropHooks } = useDragAndDrop({
    dropTargetDelegate: earlyDropTarget('.methodlist'),
    getItems: (keys: Set<Key>) => [...keys].map((key) => ({ 'text/plain': methodName(byId.get(String(key))!) })),
    onReorder: (event) => {
      if (event.target.dropPosition !== 'on') onReorder([...event.keys].map(String), String(event.target.key), event.target.dropPosition)
    },
  })

  return (
    <aside className="methods" aria-label="Methods">
      <div className="methods-head">
        <h2>Methods</h2>
        <Button className="newbtn" onPress={onNew}>
          New method
        </Button>
      </div>
      <GridList
        className="methodlist"
        aria-label="Saved methods"
        onAction={(key) => onActivate(String(key))}
        dragAndDropHooks={dragAndDropHooks}
        renderEmptyState={() => <p className="methodlist-empty">No methods yet. Make one with New method.</p>}
      >
        {rows.map(({ experiment, color, totals }) => (
          <GridListItem key={experiment.id} id={experiment.id} textValue={methodName(experiment)} className={`methodrow${experiment.id === activeId ? ' active' : ''}`}>
            {/* React Aria makes the drag button ignore the mouse (the whole row drags), so the grip under it carries the grab
                cursor, and the button on top takes keyboard focus. */}
            <span className="dragcell">
              <span className="draggrip" aria-hidden="true">
                ⠿
              </span>
              <Button slot="drag" className="draghandle" aria-label={`Move ${methodName(experiment)}`} />
            </span>
            {/* A toggle, not list selection: React Aria drags every selected row together, and this only marks charts. */}
            <ToggleButton
              className="showbox"
              aria-label={`Show ${methodName(experiment)} on the charts`}
              isSelected={shownIds.includes(experiment.id)}
              onChange={() => toggleShown(experiment.id)}
              style={{ '--series': color } as CSSProperties}
            >
              <span className="showbox-mark" aria-hidden="true" />
            </ToggleButton>
            <div className="methodrow-text">
              <span className="methodrow-name">{methodName(experiment)}</span>
              {experiment.name && <span className="methodrow-moves">{compressSeq(experiment.seq)}</span>}
            </div>
            <dl className="methodrow-totals">
              {(['sorted', 'played'] as const).map((deck) => (
                <div key={deck} className={`${deck === kind ? 'current' : ''}${totals[deck]?.stale ? ' stale' : ''}`}>
                  <dt>{DECK_LABELS[deck]}</dt>
                  <dd className={totals[deck] && totals[deck].result.clearCount === totals[deck].result.categories.length ? 'clean' : ''}>
                    {totals[deck] ? fmtLevel(totals[deck].result.total) : '…'}
                  </dd>
                </div>
              ))}
            </dl>
          </GridListItem>
        ))}
      </GridList>
      <ConfirmButton className="textbtn resetbtn" label="Reset to the default methods" armedLabel="Press again to delete the methods you made" onConfirm={onReset} />
    </aside>
  )
}
