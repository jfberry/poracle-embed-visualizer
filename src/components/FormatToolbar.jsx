import { useRef, useEffect, useCallback } from 'react';

/**
 * Discord markdown formatting toolbar.
 * Wraps selected text or inserts markers at cursor.
 *
 * Tracks the last focused input/textarea so clicking toolbar buttons
 * (which steal focus) still works correctly.
 */
export default function FormatToolbar({ targetRef }) {
  const lastInputRef = useRef(null);
  const lastSelectionRef = useRef({ start: 0, end: 0 });

  // Track which input was last focused and its selection
  useEffect(() => {
    const container = targetRef?.current;
    if (!container) return;

    const trackFocus = (e) => {
      const el = e.target;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        lastInputRef.current = el;
        lastSelectionRef.current = {
          start: el.selectionStart,
          end: el.selectionEnd,
        };
      }
    };

    const trackSelection = (e) => {
      const el = e.target;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        lastInputRef.current = el;
        lastSelectionRef.current = {
          start: el.selectionStart,
          end: el.selectionEnd,
        };
      }
    };

    container.addEventListener('focusin', trackFocus);
    container.addEventListener('keyup', trackSelection);
    container.addEventListener('mouseup', trackSelection);
    container.addEventListener('select', trackSelection);

    return () => {
      container.removeEventListener('focusin', trackFocus);
      container.removeEventListener('keyup', trackSelection);
      container.removeEventListener('mouseup', trackSelection);
      container.removeEventListener('select', trackSelection);
    };
  }, [targetRef]);

  const formats = [
    { label: 'B', title: 'Bold (**text**)', before: '**', after: '**', style: 'font-bold' },
    { label: 'I', title: 'Italic (*text*)', before: '*', after: '*', style: 'italic' },
    { label: 'U', title: 'Underline (__text__)', before: '__', after: '__', style: 'underline' },
    { label: 'S', title: 'Strikethrough (~~text~~)', before: '~~', after: '~~', style: 'line-through' },
    { label: '`', title: 'Inline code (`text`)', before: '`', after: '`', style: 'font-mono' },
    { label: '```', title: 'Code block', before: '```\n', after: '\n```', style: 'font-mono text-[9px]' },
    { label: '||', title: 'Spoiler (||text||)', before: '||', after: '||', style: '' },
    { label: '>', title: 'Block quote', before: '> ', after: '', style: '' },
    { label: '🔗', title: 'Link [text](url)', before: '[', after: '](url)', style: '' },
  ];

  const handleFormat = useCallback((format) => {
    const el = lastInputRef.current;
    if (!el) return;

    const { start, end } = lastSelectionRef.current;
    const selected = el.value.substring(start, end);

    // Restore focus and selection before inserting
    el.focus();
    el.setSelectionRange(start, end);

    const insertText = format.before + (selected || 'text') + format.after;
    document.execCommand('insertText', false, insertText);

    // If no text was selected, select the placeholder 'text' so user can type over it
    if (!selected && format.after) {
      const textStart = start + format.before.length;
      const textEnd = textStart + 4; // length of 'text'
      requestAnimationFrame(() => {
        el.setSelectionRange(textStart, textEnd);
      });
    }
  }, []);

  return (
    <div className="flex gap-0.5 flex-wrap">
      {formats.map((f) => (
        <button
          key={f.title}
          onMouseDown={(e) => e.preventDefault()} // prevent stealing focus
          onClick={() => handleFormat(f)}
          title={f.title}
          className={`px-1.5 py-0.5 text-[11px] rounded bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700 border border-transparent hover:border-gray-600 transition-colors ${f.style}`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
