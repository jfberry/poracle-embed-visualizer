/**
 * Discord markdown formatting toolbar.
 * Wraps selected text or inserts markers at cursor.
 */
export default function FormatToolbar({ targetRef }) {
  const formats = [
    { label: 'B', title: 'Bold', before: '**', after: '**', style: 'font-bold' },
    { label: 'I', title: 'Italic', before: '*', after: '*', style: 'italic' },
    { label: 'U', title: 'Underline', before: '__', after: '__', style: 'underline' },
    { label: 'S', title: 'Strikethrough', before: '~~', after: '~~', style: 'line-through' },
    { label: '`', title: 'Inline code', before: '`', after: '`', style: 'font-mono' },
    { label: '```', title: 'Code block', before: '```\n', after: '\n```', style: 'font-mono text-[9px]' },
    { label: '||', title: 'Spoiler', before: '||', after: '||', style: '' },
    { label: '>', title: 'Block quote', before: '> ', after: '', style: '' },
    { label: '🔗', title: 'Link [text](url)', before: '[', after: '](url)', style: '' },
  ];

  const handleFormat = (format) => {
    // Find the currently focused input/textarea within the editor
    // We use the targetRef to scope our search
    const container = targetRef?.current;
    const el = container
      ? container.querySelector('input:focus, textarea:focus')
      : document.querySelector('input:focus, textarea:focus');

    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = el.value.substring(start, end);

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
  };

  return (
    <div className="flex gap-0.5 flex-wrap">
      {formats.map((f) => (
        <button
          key={f.title}
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
