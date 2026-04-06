import { useCallback, useRef } from 'react';
import FormatToolbar from './FormatToolbar';

const inputClass =
  'w-full bg-gray-800 text-gray-200 border border-gray-600 rounded px-2 py-1 text-sm font-mono focus:outline-none focus:border-blue-500';
const labelClass = 'block text-xs text-gray-400 mb-1';

export default function TelegramFormEditor({ template, onChange }) {
  const formRef = useRef(null);

  const update = useCallback(
    (key, value) => {
      const updated = { ...template };
      if (value === '' || value === undefined || value === null) {
        delete updated[key];
      } else {
        updated[key] = value;
      }
      onChange(updated);
    },
    [template, onChange]
  );

  return (
    <div ref={formRef} className="p-3 space-y-3">
      {/* Content */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-gray-400">Content</label>
          <FormatToolbar targetRef={formRef} />
        </div>
        <textarea
          className={inputClass + ' min-h-[120px] resize-y'}
          value={template?.content ?? ''}
          onChange={(e) => update('content', e.target.value)}
          placeholder="Message content (supports Handlebars + Telegram Markdown)"
          rows={8}
        />
      </div>

      {/* Parse Mode */}
      <div>
        <label className={labelClass}>Parse Mode</label>
        <select
          className={inputClass}
          value={template?.parse_mode ?? 'Markdown'}
          onChange={(e) => update('parse_mode', e.target.value)}
        >
          <option value="Markdown">Markdown</option>
          <option value="MarkdownV2">MarkdownV2</option>
          <option value="HTML">HTML</option>
        </select>
      </div>

      {/* Sticker */}
      <div>
        <label className={labelClass}>Sticker URL</label>
        <input
          className={inputClass}
          value={template?.sticker ?? ''}
          onChange={(e) => update('sticker', e.target.value)}
          placeholder="{{{stickerUrl}}}"
        />
      </div>

      {/* Photo */}
      <div>
        <label className={labelClass}>Photo URL</label>
        <input
          className={inputClass}
          value={template?.photo ?? ''}
          onChange={(e) => update('photo', e.target.value)}
          placeholder="Photo/image URL (optional)"
        />
      </div>

      {/* Location */}
      <div>
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <input
            type="checkbox"
            checked={!!template?.location}
            onChange={(e) => update('location', e.target.checked || undefined)}
            className="rounded"
          />
          Send location pin
        </label>
      </div>

      {/* Webpage Preview */}
      <div>
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <input
            type="checkbox"
            checked={!!template?.webpage_preview}
            onChange={(e) => update('webpage_preview', e.target.checked || undefined)}
            className="rounded"
          />
          Show link previews
        </label>
      </div>

      {/* Venue */}
      <div className="border border-gray-700 rounded p-2 space-y-2">
        <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Venue (optional)</div>
        <div>
          <label className={labelClass}>Title</label>
          <input
            className={inputClass}
            value={template?.venue?.title ?? ''}
            onChange={(e) => {
              const venue = { ...template?.venue };
              if (e.target.value) {
                venue.title = e.target.value;
              } else {
                delete venue.title;
              }
              if (Object.keys(venue).length === 0) {
                update('venue', undefined);
              } else {
                update('venue', venue);
              }
            }}
            placeholder="Venue title"
          />
        </div>
        <div>
          <label className={labelClass}>Address</label>
          <input
            className={inputClass}
            value={template?.venue?.address ?? ''}
            onChange={(e) => {
              const venue = { ...template?.venue };
              if (e.target.value) {
                venue.address = e.target.value;
              } else {
                delete venue.address;
              }
              if (Object.keys(venue).length === 0) {
                update('venue', undefined);
              } else {
                update('venue', venue);
              }
            }}
            placeholder="Venue address"
          />
        </div>
      </div>

      {/* Send Order */}
      <div>
        <label className={labelClass}>Send Order (comma-separated)</label>
        <input
          className={inputClass}
          value={(template?.send_order || ['sticker', 'photo', 'text', 'location', 'venue']).join(', ')}
          onChange={(e) => {
            const order = e.target.value.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
            if (order.length > 0) {
              update('send_order', order);
            } else {
              update('send_order', undefined);
            }
          }}
          placeholder="sticker, photo, text, location, venue"
        />
        <p className="text-[10px] text-gray-600 mt-0.5">Controls the order Telegram messages are sent. Default: sticker, photo, text, location, venue</p>
      </div>
    </div>
  );
}
