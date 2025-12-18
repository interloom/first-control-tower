import { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react'
import { MentionDropdown, MentionOption } from './MentionDropdown'
import './MentionInput.css'
import './NodePill.css'

// SVG icons for node types (matching lucide icons)
const nodeTypeIconSvg: Record<string, string> = {
  inbox: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>',
  outbox: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>',
  procedure: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>',
  file: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>',
  agent: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>',
  table: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>',
  chart: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>',
}

export interface Mention {
  id: string
  label: string
  type: 'node' | 'command'
  nodeType?: string
}

export interface MentionInputProps {
  placeholder?: string
  mentionOptions: MentionOption[]
  onSubmit: (text: string, mentions: Mention[]) => void
  disabled?: boolean
}

export interface MentionInputHandle {
  focus: () => void
  clear: () => void
}

interface TriggerState {
  active: boolean
  startOffset: number
  query: string
  position: { top: number; left: number }
}

export const MentionInput = forwardRef<MentionInputHandle, MentionInputProps>(
  ({ placeholder = '', mentionOptions, onSubmit, disabled = false }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null)
    const [isEmpty, setIsEmpty] = useState(true)
    const [trigger, setTrigger] = useState<TriggerState>({
      active: false,
      startOffset: 0,
      query: '',
      position: { top: 0, left: 0 },
    })
    const [selectedIndex, setSelectedIndex] = useState(0)

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
      focus: () => editorRef.current?.focus(),
      clear: () => {
        if (editorRef.current) {
          editorRef.current.innerHTML = ''
          setIsEmpty(true)
        }
      },
    }))

    // Filter options based on trigger query
    const filteredOptions = trigger.active
      ? mentionOptions.filter(opt =>
          opt.label.toLowerCase().includes(trigger.query.toLowerCase())
        )
      : []

    // Reset selected index when filtered options change
    useEffect(() => {
      setSelectedIndex(0)
    }, [trigger.query])

    // Check if editor is empty and update placeholder state
    const checkEmpty = useCallback(() => {
      if (!editorRef.current) return
      const text = editorRef.current.textContent || ''
      setIsEmpty(text.trim() === '')
    }, [])

    // Get caret pixel position for dropdown placement
    const getCaretPosition = useCallback((): { top: number; left: number } => {
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) {
        return { top: 0, left: 0 }
      }

      const range = selection.getRangeAt(0).cloneRange()
      range.collapse(true)

      // Create a temporary span to measure position
      const span = document.createElement('span')
      span.textContent = '\u200B' // Zero-width space
      range.insertNode(span)

      const rect = span.getBoundingClientRect()
      const editorRect = editorRef.current?.getBoundingClientRect()

      span.parentNode?.removeChild(span)

      // Normalize selection after removing span
      selection.removeAllRanges()
      const newRange = document.createRange()
      newRange.setStart(range.startContainer, range.startOffset)
      newRange.collapse(true)
      selection.addRange(newRange)

      if (!editorRect) return { top: 0, left: 0 }

      return {
        top: rect.bottom - editorRect.top,
        left: rect.left - editorRect.left,
      }
    }, [])

    // Detect @ trigger in the current text
    const detectTrigger = useCallback(() => {
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) {
        setTrigger(prev => ({ ...prev, active: false }))
        return
      }

      const range = selection.getRangeAt(0)
      if (!range.collapsed) {
        setTrigger(prev => ({ ...prev, active: false }))
        return
      }

      // Get the text node and offset
      const node = range.startContainer
      if (node.nodeType !== Node.TEXT_NODE) {
        setTrigger(prev => ({ ...prev, active: false }))
        return
      }

      const text = node.textContent || ''
      const cursorPos = range.startOffset

      // Find the last @ before cursor that isn't preceded by a word character
      let atIndex = -1
      for (let i = cursorPos - 1; i >= 0; i--) {
        if (text[i] === '@') {
          // Check if preceded by whitespace or start of text
          if (i === 0 || /\s/.test(text[i - 1])) {
            atIndex = i
            break
          }
        }
        // If we hit whitespace before finding @, stop searching
        if (/\s/.test(text[i])) break
      }

      if (atIndex >= 0) {
        const query = text.slice(atIndex + 1, cursorPos)
        const position = getCaretPosition()
        setTrigger({
          active: true,
          startOffset: atIndex,
          query,
          position,
        })
      } else {
        setTrigger(prev => ({ ...prev, active: false }))
      }
    }, [getCaretPosition])

    // Handle input changes
    const handleInput = useCallback(() => {
      checkEmpty()
      detectTrigger()
    }, [checkEmpty, detectTrigger])

    // Insert a mention pill at current position
    const insertMention = useCallback((option: MentionOption) => {
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0 || !editorRef.current) return

      const range = selection.getRangeAt(0)
      const node = range.startContainer

      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || ''
        const cursorPos = range.startOffset

        // Find the @ position
        let atIndex = trigger.startOffset

        // Create the pill element
        const pill = document.createElement('span')
        pill.className = 'node-pill mention-pill'
        pill.contentEditable = 'false'
        pill.dataset.mentionId = option.id
        pill.dataset.mentionType = option.type
        pill.dataset.mentionLabel = option.label
        if (option.nodeType) {
          pill.dataset.nodeType = option.nodeType
          // Add icon if available
          const iconSvg = nodeTypeIconSvg[option.nodeType]
          if (iconSvg) {
            pill.innerHTML = iconSvg
          }
        }
        // Add label span
        const labelSpan = document.createElement('span')
        labelSpan.textContent = option.label
        pill.appendChild(labelSpan)

        // Add remove button
        const removeBtn = document.createElement('button')
        removeBtn.type = 'button'
        removeBtn.className = 'node-pill-remove'
        removeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>'
        removeBtn.addEventListener('click', (e) => {
          e.preventDefault()
          e.stopPropagation()
          pill.remove()
          checkEmpty()
          editorRef.current?.focus()
        })
        pill.appendChild(removeBtn)

        // Split the text node and insert the pill
        const beforeText = text.slice(0, atIndex)
        const afterText = text.slice(cursorPos)

        // Create new text nodes
        const beforeNode = document.createTextNode(beforeText)
        const afterNode = document.createTextNode(afterText.length > 0 ? afterText : '\u00A0') // nbsp if empty

        // Replace the current text node with the new structure
        const parent = node.parentNode
        if (parent) {
          parent.insertBefore(beforeNode, node)
          parent.insertBefore(pill, node)
          parent.insertBefore(afterNode, node)
          parent.removeChild(node)

          // Set cursor after the pill
          const newRange = document.createRange()
          newRange.setStart(afterNode, afterText.length > 0 ? 0 : 1)
          newRange.collapse(true)
          selection.removeAllRanges()
          selection.addRange(newRange)
        }
      }

      setTrigger(prev => ({ ...prev, active: false }))
      checkEmpty()
      editorRef.current?.focus()
    }, [trigger.startOffset, checkEmpty])

    // Handle option selection from dropdown
    const handleSelectOption = useCallback((option: MentionOption) => {
      insertMention(option)
    }, [insertMention])

    // Close dropdown
    const handleCloseDropdown = useCallback(() => {
      setTrigger(prev => ({ ...prev, active: false }))
    }, [])

    // Extract text and mentions from the editor
    const extractContent = useCallback((): { text: string; mentions: Mention[] } => {
      if (!editorRef.current) return { text: '', mentions: [] }

      const mentions: Mention[] = []
      let text = ''

      const walk = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          text += node.textContent || ''
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement
          if (el.classList.contains('mention-pill')) {
            const mention: Mention = {
              id: el.dataset.mentionId || '',
              label: el.dataset.mentionLabel || '',
              type: (el.dataset.mentionType as 'node' | 'command') || 'node',
            }
            if (el.dataset.nodeType) {
              mention.nodeType = el.dataset.nodeType
            }
            mentions.push(mention)
            text += `@${mention.label}`
          } else {
            node.childNodes.forEach(walk)
          }
        }
      }

      editorRef.current.childNodes.forEach(walk)

      return { text: text.trim(), mentions }
    }, [])

    // Handle keydown for keyboard navigation and submission
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
      if (trigger.active && filteredOptions.length > 0) {
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault()
            setSelectedIndex(prev => 
              prev < filteredOptions.length - 1 ? prev + 1 : 0
            )
            return
          case 'ArrowUp':
            e.preventDefault()
            setSelectedIndex(prev => 
              prev > 0 ? prev - 1 : filteredOptions.length - 1
            )
            return
          case 'Enter':
            e.preventDefault()
            if (filteredOptions[selectedIndex]) {
              insertMention(filteredOptions[selectedIndex])
            }
            return
          case 'Escape':
            e.preventDefault()
            setTrigger(prev => ({ ...prev, active: false }))
            return
          case 'Tab':
            e.preventDefault()
            if (filteredOptions[selectedIndex]) {
              insertMention(filteredOptions[selectedIndex])
            }
            return
        }
      }

      // Submit on Enter (without shift)
      if (e.key === 'Enter' && !e.shiftKey && !trigger.active) {
        e.preventDefault()
        const { text, mentions } = extractContent()
        if (text.trim()) {
          onSubmit(text, mentions)
        }
      }

      // Handle backspace for pill deletion
      if (e.key === 'Backspace') {
        const selection = window.getSelection()
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0)
          if (range.collapsed) {
            // Check if cursor is right after a pill
            const node = range.startContainer
            if (node.nodeType === Node.TEXT_NODE && range.startOffset === 0) {
              const prevSibling = node.previousSibling as HTMLElement
              if (prevSibling?.classList?.contains('mention-pill')) {
                e.preventDefault()
                prevSibling.remove()
                checkEmpty()
                return
              }
            }
            // Check if cursor is at start of editor and first child is a pill
            if (node === editorRef.current && range.startOffset > 0) {
              const childBefore = editorRef.current.childNodes[range.startOffset - 1] as HTMLElement
              if (childBefore?.classList?.contains('mention-pill')) {
                e.preventDefault()
                childBefore.remove()
                checkEmpty()
                return
              }
            }
          }
        }
      }
    }, [trigger.active, filteredOptions, selectedIndex, insertMention, extractContent, onSubmit, checkEmpty])

    // Handle paste - strip formatting
    const handlePaste = useCallback((e: React.ClipboardEvent) => {
      e.preventDefault()
      const text = e.clipboardData.getData('text/plain')
      document.execCommand('insertText', false, text)
    }, [])

    return (
      <div className="mention-input-wrapper">
        <div
          ref={editorRef}
          className={`mention-input-editor ${isEmpty ? 'is-empty' : ''}`}
          contentEditable={!disabled}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          data-placeholder={placeholder}
          suppressContentEditableWarning
        />
        {trigger.active && filteredOptions.length > 0 && (
          <MentionDropdown
            options={filteredOptions}
            selectedIndex={selectedIndex}
            onSelect={handleSelectOption}
            onClose={handleCloseDropdown}
            position={trigger.position}
          />
        )}
      </div>
    )
  }
)

MentionInput.displayName = 'MentionInput'
