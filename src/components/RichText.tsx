import { Fragment } from 'react'

/** Render text where `<i>…</i>` marks italics. No other markup is interpreted. */
export default function RichText({ text }: { text: string }) {
  const parts = text.split(/<i>(.*?)<\/i>/g)
  return (
    <>
      {parts.map((part, index) => (index % 2 === 1 ? <i key={index}>{part}</i> : <Fragment key={index}>{part}</Fragment>))}
    </>
  )
}
