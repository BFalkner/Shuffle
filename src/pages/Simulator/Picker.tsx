import { Button, Label, ListBox, ListBoxItem, Popover, Select, SelectValue, type Key } from 'react-aria-components'

interface Props<T extends Key> {
  label: string
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (value: T) => void
}

/** A labelled dropdown for one of a few fixed choices. */
export default function Picker<T extends Key>({ label, value, options, onChange }: Props<T>) {
  return (
    <Select className="picker" value={value} onChange={(key) => onChange(key as T)}>
      <Label>{label}</Label>
      <Button className="picker-button">
        <SelectValue />
        <span className="picker-chevron" aria-hidden="true">
          ▾
        </span>
      </Button>
      <Popover className="picker-popover" offset={4}>
        <ListBox className="picker-list">
          {options.map((option) => (
            <ListBoxItem key={option.value} id={option.value} className="picker-option">
              {option.label}
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
    </Select>
  )
}
