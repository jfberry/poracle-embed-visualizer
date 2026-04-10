import { useState, useCallback, useRef, useEffect } from 'react';
import FormEditor from './FormEditor';
import TelegramFormEditor from './TelegramFormEditor';
import RawEditor from './RawEditor';
import { tabClass } from '../lib/styles';

export default function TemplateEditor({ template, templateFileContent, onChange, onFileContentChange, platform }) {
  const [mode, setMode] = useState('form');
  // In raw mode, keep local text state so the user can make multi-keystroke
  // edits (including temporarily invalid JSON) without crashing. Only push
  // valid JSON to the parent on a debounce.
  const [rawText, setRawText] = useState('');
  const debounceRef = useRef(null);
  const userEditingRef = useRef(false);

  // Sync rawText from parent when switching TO raw mode or when parent
  // template changes while the user isn't actively editing
  useEffect(() => {
    if (mode === 'raw' && !userEditingRef.current && template) {
      setRawText(JSON.stringify(template, null, 2));
    }
  }, [template, mode]);

  // When switching to raw mode, snapshot the current template
  const switchToRaw = useCallback(() => {
    setRawText(JSON.stringify(template, null, 2));
    userEditingRef.current = false;
    setMode('raw');
  }, [template]);

  // When switching to form mode, try to apply any pending raw edits
  const switchToForm = useCallback(() => {
    if (userEditingRef.current) {
      try {
        const parsed = JSON.parse(rawText);
        onChange(parsed);
      } catch {
        // If the JSON is invalid, keep the old template — user will see
        // the form with whatever was last valid
      }
    }
    userEditingRef.current = false;
    setMode('form');
  }, [rawText, onChange]);

  const handleRawChange = useCallback(
    (text) => {
      setRawText(text);
      userEditingRef.current = true;

      // Debounce: apply valid JSON to parent after 800ms of no typing
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        try {
          const parsed = JSON.parse(text);
          onChange(parsed);
          // Don't clear userEditingRef — the user might still be editing
        } catch {
          // Still invalid JSON, that's fine
        }
      }, 800);
    },
    [onChange]
  );

  // Cleanup debounce on unmount
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const isTemplateFile = templateFileContent != null;
  const isTelegram = platform === 'telegram';

  // For templateFile entries: raw Handlebars text editor only
  if (isTemplateFile) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-700 text-sm">
          <span className="text-blue-400 text-xs font-medium">Template File</span>
          <span className="text-gray-500 text-[10px]">Raw Handlebars — not structured JSON</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <RawEditor
            value={templateFileContent}
            onChange={(text) => onFileContentChange?.(text)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 px-3 py-1.5 border-b border-gray-700 text-sm">
        <button onClick={switchToForm} className={tabClass(mode === 'form')}>
          Form
        </button>
        <button onClick={switchToRaw} className={tabClass(mode === 'raw')}>
          Raw JSON
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {mode === 'form' ? (
          isTelegram ? (
            <TelegramFormEditor template={template} onChange={onChange} />
          ) : (
            <FormEditor template={template} onChange={onChange} />
          )
        ) : (
          <RawEditor value={rawText} onChange={handleRawChange} />
        )}
      </div>
    </div>
  );
}
