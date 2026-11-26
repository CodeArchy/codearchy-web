import { useState } from 'react'
import { CheckIcon, CopyIcon } from '../icons'

/** A terminal command with a Copy button. */
export default function CopyCommand({ command }) {
  const [copied, setCopied] = useState(false)
  const copy = () =>
    navigator.clipboard?.writeText(command).then(
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1600)
      },
      () => undefined
    )
  return (
    <div className="command">
      <code>
        <span className="command__prompt" aria-hidden="true">$</span>
        {/* A flag stays on one line with its value, so a wrap never leaves `.` alone. */}
        {command.split(/(--\S+ \S+)/).map((part, i) =>
          i % 2 ? <span key={i} className="command__nowrap">{part}</span> : part
        )}
      </code>
      <button type="button" onClick={copy} aria-label={copied ? 'Copied' : `Copy: ${command}`} title={copied ? 'Copied' : 'Copy'}>
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>
    </div>
  )
}
