import { useState, useMemo } from 'react';
import { getFieldsForType } from '../lib/field-definitions';

const categoryColors = {
  pokemon: 'text-yellow-300',
  identity: 'text-yellow-300',
  stats: 'text-green-400',
  moves: 'text-cyan-400',
  time: 'text-orange-400',
  location: 'text-pink-400',
  map: 'text-pink-400',
  maps: 'text-pink-400',
  media: 'text-pink-300',
  weather: 'text-blue-400',
  pvp: 'text-purple-400',
  display: 'text-yellow-200',
  raid: 'text-red-400',
  gym: 'text-red-300',
  pokestop: 'text-amber-400',
  quest: 'text-amber-300',
  invasion: 'text-rose-400',
  lure: 'text-teal-400',
  nest: 'text-lime-400',
  other: 'text-gray-400',
};

const urlFields = new Set([
  'staticMap', 'staticmap', 'imgUrl', 'imgUrlAlt', 'stickerUrl',
  'googleMapUrl', 'appleMapUrl', 'wazeMapUrl', 'mapurl', 'applemap',
  'rdmUrl', 'reactMapUrl', 'rocketMadUrl',
]);

const helpers = [
  { label: '{{#if ...}}', snippet: '{{#if fieldName}}...{{/if}}', desc: 'Conditional block' },
  { label: '{{#each ...}}', snippet: '{{#each arrayField}}...{{/each}}', desc: 'Iterate array' },
  { label: '{{#unless ...}}', snippet: '{{#unless fieldName}}...{{/unless}}', desc: 'Inverse conditional' },
  { label: '{{round ...}}', snippet: '{{round fieldName}}', desc: 'Round number' },
  { label: '{{numberFormat ...}}', snippet: '{{numberFormat fieldName 2}}', desc: 'Format decimals' },
  { label: '{{#eq a b}}', snippet: '{{#eq fieldA "value"}}...{{else}}...{{/eq}}', desc: 'Equals check' },
  { label: '{{#compare ...}}', snippet: '{{#compare fieldA ">" fieldB}}...{{/compare}}', desc: 'Comparison operator' },
  { label: '{{#forEach ...}}', snippet: '{{#forEach arrayField}}{{this}}{{#unless isLast}}, {{/unless}}{{/forEach}}', desc: 'Iterate with isFirst/isLast' },
];

export default function TagPicker({ type, onInsertTag, apiFields }) {
  const [showRaw, setShowRaw] = useState(false);
  const [showDeprecated, setShowDeprecated] = useState(false);
  const [lastInserted, setLastInserted] = useState(null);

  const grouped = useMemo(() => {
    const fields = apiFields && apiFields.length > 0 ? apiFields : getFieldsForType(type);
    const filtered = fields.filter((f) => {
      if (f.rawWebhook && !showRaw) return false;
      if (f.deprecated && !showDeprecated) return false;
      return true;
    });
    filtered.sort((a, b) => (b.preferred ? 1 : 0) - (a.preferred ? 1 : 0));
    const groups = {};
    for (const f of filtered) {
      const cat = f.category || 'other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(f);
    }
    return groups;
  }, [type, showRaw, showDeprecated, apiFields]);

  const handleClick = (field) => {
    const tag = urlFields.has(field.name) ? `{{{${field.name}}}}` : `{{${field.name}}}`;
    const inserted = onInsertTag?.(tag);
    if (!inserted) {
      navigator.clipboard?.writeText(tag).catch(() => {});
    }
    setLastInserted(tag);
    setTimeout(() => setLastInserted(null), 2000);
  };

  const handleHelperClick = (snippet) => {
    const inserted = onInsertTag?.(snippet);
    if (!inserted) {
      navigator.clipboard?.writeText(snippet).catch(() => {});
    }
    setLastInserted(snippet);
    setTimeout(() => setLastInserted(null), 2000);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-2 pt-1 shrink-0">
        {lastInserted && (
          <div className="mb-1 px-2 py-1 bg-green-900/30 border border-green-700 rounded text-green-300 text-xs font-mono">
            Inserted: {lastInserted}
          </div>
        )}
        <p className="text-gray-600 text-[10px] mb-1">Hover for description. Click to insert at cursor.</p>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-3">
        {Object.entries(grouped).map(([category, fields]) => (
          <div key={category}>
            <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${categoryColors[category] || 'text-gray-400'}`}>
              {category}
            </div>
            <div className="flex flex-wrap gap-1">
              {fields.map((f) => (
                <button
                  key={f.name}
                  onClick={() => handleClick(f)}
                  title={`${f.description || f.name}${f.deprecated && f.preferredAlternative ? `\n→ use ${f.preferredAlternative}` : ''}`}
                  className={`text-[11px] px-1.5 py-0.5 rounded cursor-pointer border border-transparent hover:border-gray-500 transition-colors ${
                    f.deprecated
                      ? 'line-through text-gray-600 bg-gray-800/40'
                      : f.rawWebhook
                        ? 'text-gray-500 bg-gray-800/40'
                        : f.preferred
                          ? `${categoryColors[f.category] || 'text-gray-300'} bg-gray-800/40 font-medium`
                          : 'text-gray-400 bg-gray-800/40'
                  }`}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Helpers section */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-1 text-gray-500">
            Helpers
          </div>
          <div className="flex flex-wrap gap-1">
            {helpers.map((h) => (
              <button
                key={h.label}
                onClick={() => handleHelperClick(h.snippet)}
                title={`${h.desc}\n${h.snippet}`}
                className="text-[11px] px-1.5 py-0.5 rounded cursor-pointer bg-gray-800/60 text-gray-400 border border-transparent hover:border-gray-500 transition-colors"
              >
                {h.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Toggles at bottom */}
      <div className="border-t border-gray-700 px-2 py-1.5 space-y-1 shrink-0">
        <label className="flex items-center gap-1.5 text-[11px] text-gray-400 cursor-pointer">
          <input type="checkbox" checked={showRaw} onChange={(e) => setShowRaw(e.target.checked)} className="rounded text-xs" />
          Show raw webhook
        </label>
        <label className="flex items-center gap-1.5 text-[11px] text-gray-400 cursor-pointer">
          <input type="checkbox" checked={showDeprecated} onChange={(e) => setShowDeprecated(e.target.checked)} className="rounded text-xs" />
          Show deprecated
        </label>
      </div>
    </div>
  );
}
