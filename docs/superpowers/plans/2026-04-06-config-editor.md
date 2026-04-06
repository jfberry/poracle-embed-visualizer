# Config Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a configuration editor tab to the Poracle DTS Editor that reads config schema and values from PoracleNG, renders a form-based UI with sidebar navigation, resolves Discord/Telegram IDs to names, and saves changes back.

**Architecture:** New top-level tab alongside DTS editor. Shares the existing connect screen, API client, and status bar. Config data flows: fetch schema + values from API → render form by section → track dirty fields → save partial updates. ID resolution uses a batch endpoint with client-side caching.

**Tech Stack:** React 18, Tailwind CSS, existing API client infrastructure.

**Design spec:** `docs/superpowers/specs/2026-04-06-config-editor-design.md`

---

## File Structure

### Files to create
- `src/hooks/useConfig.js` — fetch schema/values, dirty tracking, save, resolve cache
- `src/components/ConfigEditor.jsx` — main config editor (sidebar + section panel)
- `src/components/ConfigSidebar.jsx` — section navigation with active/dirty indicators
- `src/components/ConfigSection.jsx` — renders all fields for a section
- `src/components/ConfigField.jsx` — per-field renderer dispatching by type
- `src/components/ConfigTagInput.jsx` — tag/chip input for string[] fields with resolve
- `src/components/ConfigTable.jsx` — table editor for array-of-tables (communities, delegated_admins, etc.)

### Files to modify
- `src/lib/api-client.js` — add config and resolve API methods
- `src/App.jsx` — add top-level tab navigation, render ConfigEditor when active
- `src/components/TopBar.jsx` — add Templates/Config tabs, context-switch buttons
- `src/components/StatusBar.jsx` — show config dirty count + restart indicator

---

## Task 1: API Client Methods

**Files:**
- Modify: `src/lib/api-client.js`

- [ ] **Step 1: Add config and resolve methods to PoracleApiClient**

Add these methods to the `PoracleApiClient` class in `src/lib/api-client.js`, after the existing `getPartials()` method:

```js
  async getConfigSchema() {
    return this.fetch('/api/config/schema');
  }

  async getConfigValues(section) {
    const params = section ? `?section=${encodeURIComponent(section)}` : '';
    return this.fetch(`/api/config/values${params}`);
  }

  async saveConfigValues(updates) {
    return this.fetch('/api/config/values', {
      method: 'POST',
      body: JSON.stringify(updates),
    });
  }

  async resolve(request) {
    return this.fetch('/api/resolve', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/lib/api-client.js
git commit -m "feat: add config schema, values, and resolve API methods"
```

---

## Task 2: useConfig Hook

**Files:**
- Create: `src/hooks/useConfig.js`

This hook manages fetching schema + values, dirty tracking, saving, and ID resolution.

- [ ] **Step 1: Create useConfig.js**

Create `src/hooks/useConfig.js`:

```js
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';

export function useConfig(apiClient) {
  const [schema, setSchema] = useState(null); // array of sections
  const [values, setValues] = useState({}); // {sectionName: {field: value}}
  const [originalValues, setOriginalValues] = useState({}); // snapshot at load
  const [activeSection, setActiveSection] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saveResult, setSaveResult] = useState(null);
  const resolveCache = useRef(new Map());

  // Fetch schema and values
  const load = useCallback(async () => {
    if (!apiClient) return;
    setLoading(true);
    setError(null);
    try {
      const [schemaRes, valuesRes] = await Promise.all([
        apiClient.getConfigSchema(),
        apiClient.getConfigValues(),
      ]);
      const sections = schemaRes.sections || [];
      setSchema(sections);
      setValues(valuesRes.values || {});
      setOriginalValues(JSON.parse(JSON.stringify(valuesRes.values || {})));
      if (sections.length > 0 && !activeSection) {
        setActiveSection(sections[0].name);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiClient, activeSection]);

  // Update a single field value
  const updateField = useCallback((section, field, value) => {
    setValues((prev) => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }));
  }, []);

  // Update a table (array) value
  const updateTable = useCallback((section, tableName, tableValue) => {
    setValues((prev) => ({
      ...prev,
      [section]: { ...prev[section], [tableName]: tableValue },
    }));
  }, []);

  // Compute dirty fields (changed from original)
  const dirtyFields = useMemo(() => {
    const dirty = {};
    let count = 0;
    for (const section of Object.keys(values)) {
      const orig = originalValues[section] || {};
      const curr = values[section] || {};
      const sectionDirty = {};
      for (const field of Object.keys(curr)) {
        if (JSON.stringify(curr[field]) !== JSON.stringify(orig[field])) {
          // Skip sensitive fields that are still masked
          if (curr[field] === '****') continue;
          sectionDirty[field] = curr[field];
          count++;
        }
      }
      if (Object.keys(sectionDirty).length > 0) {
        dirty[section] = sectionDirty;
      }
    }
    return { dirty, count };
  }, [values, originalValues]);

  // Check which dirty sections have fields requiring restart
  const restartRequired = useMemo(() => {
    if (!schema || dirtyFields.count === 0) return { required: false, fields: [] };
    const fields = [];
    for (const section of schema) {
      if (!dirtyFields.dirty[section.name]) continue;
      for (const field of section.fields) {
        if (dirtyFields.dirty[section.name][field.name] !== undefined && !field.hotReload) {
          fields.push(`${section.name}.${field.name}`);
        }
      }
    }
    return { required: fields.length > 0, fields };
  }, [schema, dirtyFields]);

  // Which sections have dirty fields (for sidebar dots)
  const dirtySections = useMemo(() => {
    return new Set(Object.keys(dirtyFields.dirty));
  }, [dirtyFields]);

  // Save dirty fields
  const save = useCallback(async () => {
    if (!apiClient || dirtyFields.count === 0) return;
    setSaveResult(null);
    try {
      const result = await apiClient.saveConfigValues(dirtyFields.dirty);
      setSaveResult(result);
      // Update original values to reflect saved state
      setOriginalValues(JSON.parse(JSON.stringify(values)));
      return result;
    } catch (err) {
      setSaveResult({ status: 'error', message: err.message });
      throw err;
    }
  }, [apiClient, dirtyFields, values]);

  // Resolve IDs — batch resolve and cache
  const resolveIds = useCallback(async (request) => {
    if (!apiClient) return {};

    // Check cache and filter out already-resolved IDs
    const uncached = { discord: {}, telegram: {} };
    const fromCache = { discord: {}, telegram: {} };
    let needsFetch = false;

    if (request.discord) {
      for (const [type, ids] of Object.entries(request.discord)) {
        uncached.discord[type] = [];
        fromCache.discord[type] = {};
        for (const id of ids) {
          const cacheKey = `discord:${type}:${id}`;
          if (resolveCache.current.has(cacheKey)) {
            fromCache.discord[type][id] = resolveCache.current.get(cacheKey);
          } else {
            uncached.discord[type].push(id);
            needsFetch = true;
          }
        }
        if (uncached.discord[type].length === 0) delete uncached.discord[type];
      }
      if (Object.keys(uncached.discord).length === 0) delete uncached.discord;
    }

    if (request.telegram) {
      for (const [type, ids] of Object.entries(request.telegram)) {
        uncached.telegram[type] = [];
        fromCache.telegram[type] = {};
        for (const id of ids) {
          const cacheKey = `telegram:${type}:${id}`;
          if (resolveCache.current.has(cacheKey)) {
            fromCache.telegram[type][id] = resolveCache.current.get(cacheKey);
          } else {
            uncached.telegram[type].push(id);
            needsFetch = true;
          }
        }
        if (uncached.telegram[type].length === 0) delete uncached.telegram[type];
      }
      if (Object.keys(uncached.telegram).length === 0) delete uncached.telegram;
    }

    // Fetch uncached
    let fetched = {};
    if (needsFetch) {
      try {
        fetched = await apiClient.resolve(uncached);
        // Store in cache
        if (fetched.discord) {
          for (const [type, resolved] of Object.entries(fetched.discord)) {
            for (const [id, data] of Object.entries(resolved)) {
              resolveCache.current.set(`discord:${type}:${id}`, data);
            }
          }
        }
        if (fetched.telegram) {
          for (const [type, resolved] of Object.entries(fetched.telegram)) {
            for (const [id, data] of Object.entries(resolved)) {
              resolveCache.current.set(`telegram:${type}:${id}`, data);
            }
          }
        }
      } catch {
        // Resolution failure is not critical
      }
    }

    // Merge cached + fetched
    const result = { discord: {}, telegram: {} };
    for (const platform of ['discord', 'telegram']) {
      for (const type of Object.keys(fromCache[platform] || {})) {
        result[platform][type] = { ...fromCache[platform][type] };
      }
      for (const type of Object.keys(fetched[platform] || {})) {
        result[platform][type] = { ...result[platform][type], ...fetched[platform][type] };
      }
    }
    return result;
  }, [apiClient]);

  return {
    schema,
    values,
    originalValues,
    activeSection,
    setActiveSection,
    loading,
    error,
    saveResult,
    load,
    updateField,
    updateTable,
    dirtyFields,
    dirtySections,
    restartRequired,
    save,
    resolveIds,
  };
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useConfig.js
git commit -m "feat: add useConfig hook with schema/values fetching, dirty tracking, and resolve"
```

---

## Task 3: ConfigField Component

**Files:**
- Create: `src/components/ConfigField.jsx`

Renders a single config field based on its type. This is the core renderer used by ConfigSection.

- [ ] **Step 1: Create ConfigField.jsx**

Create `src/components/ConfigField.jsx`:

```jsx
import { useState } from 'react';

const inputClass =
  'w-full bg-gray-800 text-gray-200 border border-gray-600 rounded px-2 py-1.5 text-sm font-mono focus:outline-none focus:border-blue-500';

function ResolvedLabel({ id, resolved }) {
  if (!resolved) return <span className="font-mono">{id}</span>;
  return (
    <span>
      <span className="text-gray-200">{resolved.name || resolved.globalName || id}</span>
      {resolved.guild && <span className="text-gray-500 text-[10px] ml-1">({resolved.guild})</span>}
      <span className="block text-[10px] text-gray-500 font-mono">{id}</span>
    </span>
  );
}

function StringField({ value, onChange, placeholder }) {
  return (
    <input
      className={inputClass}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

function NumberField({ value, onChange, isFloat }) {
  return (
    <input
      className={inputClass}
      type="number"
      step={isFloat ? 'any' : '1'}
      value={value ?? ''}
      onChange={(e) => {
        const v = e.target.value;
        if (v === '') onChange(undefined);
        else onChange(isFloat ? parseFloat(v) : parseInt(v, 10));
      }}
    />
  );
}

function BoolField({ value, onChange, label }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={!!value}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded"
      />
      <span className="text-sm text-gray-300">{label}</span>
    </label>
  );
}

function SelectField({ value, onChange, options }) {
  if (options.length <= 5) {
    // Radio group
    return (
      <div className="space-y-1.5">
        {options.map((opt) => (
          <label key={opt.value} className="flex items-start gap-2 cursor-pointer">
            <input
              type="radio"
              name={`select-${options[0]?.value}`}
              checked={String(value) === String(opt.value)}
              onChange={() => onChange(opt.value)}
              className="mt-1"
            />
            <div>
              <span className="text-sm text-gray-200">{opt.label}</span>
              {opt.description && (
                <span className="block text-[11px] text-gray-500">{opt.description}</span>
              )}
            </div>
          </label>
        ))}
      </div>
    );
  }
  // Dropdown for > 5 options
  return (
    <select
      className={inputClass}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

function SensitiveField({ value, onChange }) {
  const [revealed, setRevealed] = useState(false);
  const isMasked = value === '****';

  return (
    <div className="flex gap-2">
      <input
        className={inputClass + ' flex-1'}
        type={revealed ? 'text' : 'password'}
        value={isMasked && !revealed ? '' : (value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        placeholder={isMasked ? '(unchanged)' : ''}
      />
      <button
        onClick={() => setRevealed(!revealed)}
        className="text-xs text-gray-500 hover:text-gray-300 px-2"
        type="button"
      >
        {revealed ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}

function MapField({ value, onChange }) {
  const entries = Object.entries(value || {});

  const updateKey = (oldKey, newKey) => {
    const updated = {};
    for (const [k, v] of entries) {
      updated[k === oldKey ? newKey : k] = v;
    }
    onChange(updated);
  };

  const updateValue = (key, newValue) => {
    onChange({ ...value, [key]: newValue });
  };

  const addEntry = () => {
    onChange({ ...value, '': '' });
  };

  const removeEntry = (key) => {
    const updated = { ...value };
    delete updated[key];
    onChange(updated);
  };

  return (
    <div className="space-y-1.5">
      {entries.map(([k, v], i) => (
        <div key={i} className="flex gap-1.5 items-center">
          <input
            className={inputClass + ' flex-1'}
            value={k}
            onChange={(e) => updateKey(k, e.target.value)}
            placeholder="Key"
          />
          <input
            className={inputClass + ' flex-1'}
            value={v ?? ''}
            onChange={(e) => updateValue(k, e.target.value)}
            placeholder="Value"
          />
          <button
            onClick={() => removeEntry(k)}
            className="text-red-400 hover:text-red-300 text-xs px-1"
            type="button"
          >
            ×
          </button>
        </div>
      ))}
      <button
        onClick={addEntry}
        className="text-xs text-blue-400 hover:text-blue-300"
        type="button"
      >
        + Add entry
      </button>
    </div>
  );
}

export default function ConfigField({ field, value, onChange, isDirty }) {
  const { name, type, description, hotReload, sensitive, options } = field;

  return (
    <div className={`py-2 ${isDirty ? 'border-l-2 border-blue-500 pl-3' : 'pl-3'}`}>
      <div className="flex items-center gap-2 mb-1">
        <label className="text-sm text-gray-300 font-medium">{name}</label>
        {!hotReload && (
          <span className="text-[10px] text-amber-500" title="Requires restart to take effect">🔄</span>
        )}
        {isDirty && (
          <span className="text-[10px] text-blue-400">modified</span>
        )}
      </div>
      {description && (
        <p className="text-[11px] text-gray-500 mb-1.5">{description}</p>
      )}

      {sensitive ? (
        <SensitiveField value={value} onChange={onChange} />
      ) : type === 'bool' ? (
        <BoolField value={value} onChange={onChange} label={description} />
      ) : type === 'select' && options ? (
        <SelectField value={value} onChange={onChange} options={options} />
      ) : type === 'int' ? (
        <NumberField value={value} onChange={onChange} isFloat={false} />
      ) : type === 'float' ? (
        <NumberField value={value} onChange={onChange} isFloat={true} />
      ) : type === 'map' ? (
        <MapField value={value} onChange={onChange} />
      ) : (
        <StringField value={value} onChange={onChange} />
      )}
    </div>
  );
}

export { ResolvedLabel };
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/ConfigField.jsx
git commit -m "feat: add ConfigField component with renderers for all field types"
```

---

## Task 4: ConfigTagInput Component

**Files:**
- Create: `src/components/ConfigTagInput.jsx`

Tag/chip input for `string[]` fields. Shows resolved names for Discord/Telegram IDs.

- [ ] **Step 1: Create ConfigTagInput.jsx**

Create `src/components/ConfigTagInput.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { ResolvedLabel } from './ConfigField';

export default function ConfigTagInput({ value, onChange, resolve, resolveIds, field }) {
  const [input, setInput] = useState('');
  const [resolved, setResolved] = useState({});

  const items = Array.isArray(value) ? value : [];

  // Resolve IDs when items change
  useEffect(() => {
    if (!resolve || !resolveIds || items.length === 0) return;

    const request = buildResolveRequest(resolve, items);
    if (!request) return;

    resolveIds(request).then((result) => {
      const map = extractResolvedMap(resolve, result);
      setResolved(map);
    });
  }, [items.join(','), resolve, resolveIds]);

  const addItem = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (!items.includes(trimmed)) {
      onChange([...items, trimmed]);
      // Resolve the new item
      if (resolve && resolveIds) {
        const request = buildResolveRequest(resolve, [trimmed]);
        if (request) {
          resolveIds(request).then((result) => {
            const map = extractResolvedMap(resolve, result);
            setResolved((prev) => ({ ...prev, ...map }));
          });
        }
      }
    }
    setInput('');
  };

  const removeItem = (item) => {
    onChange(items.filter((i) => i !== item));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addItem();
    }
    if (e.key === 'Backspace' && input === '' && items.length > 0) {
      removeItem(items[items.length - 1]);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {items.map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-1 bg-gray-800 border border-gray-600 rounded px-2 py-0.5 text-xs"
          >
            {resolve && resolved[item] ? (
              <ResolvedLabel id={item} resolved={resolved[item]} />
            ) : (
              <span className="font-mono text-gray-300">{item}</span>
            )}
            <button
              onClick={() => removeItem(item)}
              className="text-gray-500 hover:text-red-400 ml-0.5"
              type="button"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-1.5">
        <input
          className="flex-1 bg-gray-800 text-gray-200 border border-gray-600 rounded px-2 py-1 text-sm font-mono focus:outline-none focus:border-blue-500"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Add ${field.name}... (Enter to add)`}
        />
        <button
          onClick={addItem}
          className="text-xs text-blue-400 hover:text-blue-300 px-2 border border-gray-600 rounded"
          type="button"
        >
          Add
        </button>
      </div>
    </div>
  );
}

// Build a resolve request from a resolve hint string and list of IDs
function buildResolveRequest(resolveHint, ids) {
  if (!resolveHint || ids.length === 0) return null;

  // Parse hint: "discord:user", "discord:role", "discord:channel", "discord:user|role", "telegram:chat"
  const [platform, type] = resolveHint.split(':');

  if (platform === 'discord') {
    if (type === 'user|role') {
      // Try both
      return { discord: { users: ids, roles: ids } };
    }
    if (type === 'target') {
      return { discord: { users: ids, channels: ids } };
    }
    return { discord: { [type + 's']: ids } };
  }

  if (platform === 'telegram') {
    return { telegram: { chats: ids } };
  }

  return null;
}

// Extract a flat id→resolved map from the resolve response
function extractResolvedMap(resolveHint, result) {
  const map = {};
  const [platform, type] = resolveHint.split(':');

  if (platform === 'discord' && result.discord) {
    // Merge all resolved types (for user|role, both users and roles are returned)
    for (const resolved of Object.values(result.discord)) {
      for (const [id, data] of Object.entries(resolved)) {
        map[id] = data;
      }
    }
  }

  if (platform === 'telegram' && result.telegram) {
    for (const resolved of Object.values(result.telegram)) {
      for (const [id, data] of Object.entries(resolved)) {
        map[id] = data;
      }
    }
  }

  return map;
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/ConfigTagInput.jsx
git commit -m "feat: add ConfigTagInput component with resolve support for Discord/Telegram IDs"
```

---

## Task 5: ConfigTable Component

**Files:**
- Create: `src/components/ConfigTable.jsx`

Card-based editor for array-of-tables fields (communities, delegated_admins, role_subscriptions).

- [ ] **Step 1: Create ConfigTable.jsx**

Create `src/components/ConfigTable.jsx`:

```jsx
import { useState } from 'react';
import ConfigField from './ConfigField';
import ConfigTagInput from './ConfigTagInput';

export default function ConfigTable({ table, value, onChange, resolveIds }) {
  const [expandedIndex, setExpandedIndex] = useState(null);
  const entries = Array.isArray(value) ? value : [];

  const updateEntry = (index, field, fieldValue) => {
    const updated = [...entries];
    updated[index] = { ...updated[index], [field]: fieldValue };
    onChange(updated);
  };

  const removeEntry = (index) => {
    if (!confirm(`Remove this ${table.title || table.name} entry?`)) return;
    const updated = entries.filter((_, i) => i !== index);
    onChange(updated);
  };

  const addEntry = () => {
    const newEntry = {};
    for (const field of table.fields) {
      if (field.type === 'string[]') newEntry[field.name] = [];
      else if (field.type === 'bool') newEntry[field.name] = false;
      else if (field.type === 'int' || field.type === 'float') newEntry[field.name] = 0;
      else newEntry[field.name] = '';
    }
    onChange([...entries, newEntry]);
    setExpandedIndex(entries.length);
  };

  // Determine a display label for each entry
  const entryLabel = (entry) => {
    // Use the first string field as label
    for (const field of table.fields) {
      if (field.type === 'string' && entry[field.name]) {
        return entry[field.name];
      }
    }
    return '(unnamed)';
  };

  return (
    <div className="space-y-2">
      <div className="text-xs text-gray-400 mb-1">{table.description}</div>
      {entries.map((entry, index) => (
        <div key={index} className="border border-gray-700 rounded">
          <div
            className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-800/50"
            onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500">{expandedIndex === index ? '▼' : '▶'}</span>
              <span className="text-sm text-gray-300">{entryLabel(entry)}</span>
              <span className="text-[10px] text-gray-600">#{index + 1}</span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); removeEntry(index); }}
              className="text-xs text-red-400 hover:text-red-300"
              type="button"
            >
              Remove
            </button>
          </div>
          {expandedIndex === index && (
            <div className="px-3 pb-3 border-t border-gray-700 space-y-2 pt-2">
              {table.fields.map((field) => {
                const fieldValue = entry[field.name];
                if (field.type === 'string[]') {
                  return (
                    <div key={field.name}>
                      <label className="block text-xs text-gray-400 mb-1">{field.name}</label>
                      {field.description && (
                        <p className="text-[10px] text-gray-500 mb-1">{field.description}</p>
                      )}
                      <ConfigTagInput
                        value={fieldValue}
                        onChange={(v) => updateEntry(index, field.name, v)}
                        resolve={field.resolve}
                        resolveIds={resolveIds}
                        field={field}
                      />
                    </div>
                  );
                }
                return (
                  <ConfigField
                    key={field.name}
                    field={field}
                    value={fieldValue}
                    onChange={(v) => updateEntry(index, field.name, v)}
                    isDirty={false}
                  />
                );
              })}
            </div>
          )}
        </div>
      ))}
      <button
        onClick={addEntry}
        className="w-full text-sm text-blue-400 hover:text-blue-300 border border-dashed border-gray-600 rounded py-1.5"
        type="button"
      >
        + Add {table.title || table.name}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/ConfigTable.jsx
git commit -m "feat: add ConfigTable component for array-of-tables editing"
```

---

## Task 6: ConfigSection and ConfigSidebar

**Files:**
- Create: `src/components/ConfigSection.jsx`
- Create: `src/components/ConfigSidebar.jsx`

- [ ] **Step 1: Create ConfigSection.jsx**

Create `src/components/ConfigSection.jsx`:

```jsx
import { useEffect, useMemo } from 'react';
import ConfigField from './ConfigField';
import ConfigTagInput from './ConfigTagInput';
import ConfigTable from './ConfigTable';

export default function ConfigSection({ section, values, originalValues, onUpdateField, onUpdateTable, resolveIds }) {
  const sectionValues = values || {};
  const sectionOriginal = originalValues || {};

  // Collect IDs that need resolving in this section
  useEffect(() => {
    if (!resolveIds) return;

    const request = { discord: {}, telegram: {} };
    let hasIds = false;

    for (const field of section.fields) {
      if (!field.resolve) continue;
      const val = sectionValues[field.name];
      if (!val) continue;

      const ids = Array.isArray(val) ? val : [String(val)];
      if (ids.length === 0) continue;

      const [platform, type] = field.resolve.split(':');
      if (platform === 'discord') {
        const key = type === 'user|role' ? 'users' : type === 'target' ? 'users' : type + 's';
        request.discord[key] = [...(request.discord[key] || []), ...ids];
        if (type === 'user|role') {
          request.discord.roles = [...(request.discord.roles || []), ...ids];
        }
        if (type === 'target') {
          request.discord.channels = [...(request.discord.channels || []), ...ids];
        }
        hasIds = true;
      } else if (platform === 'telegram') {
        request.telegram.chats = [...(request.telegram.chats || []), ...ids];
        hasIds = true;
      }
    }

    // Also check table fields
    for (const table of section.tables || []) {
      const tableVal = sectionValues[table.name];
      if (!Array.isArray(tableVal)) continue;
      for (const entry of tableVal) {
        for (const field of table.fields) {
          if (!field.resolve) continue;
          const val = entry[field.name];
          if (!val) continue;
          const ids = Array.isArray(val) ? val : [String(val)];
          const [platform, type] = field.resolve.split(':');
          if (platform === 'discord') {
            const key = type + 's';
            request.discord[key] = [...(request.discord[key] || []), ...ids];
            hasIds = true;
          } else if (platform === 'telegram') {
            request.telegram.chats = [...(request.telegram.chats || []), ...ids];
            hasIds = true;
          }
        }
      }
    }

    if (hasIds) {
      // Clean up empty arrays
      for (const platform of ['discord', 'telegram']) {
        for (const [key, ids] of Object.entries(request[platform])) {
          if (ids.length === 0) delete request[platform][key];
        }
        if (Object.keys(request[platform]).length === 0) delete request[platform];
      }
      if (Object.keys(request).length > 0) {
        resolveIds(request);
      }
    }
  }, [section.name, resolveIds]);

  // Evaluate dependency visibility
  const isVisible = (field) => {
    if (!field.dependsOn) return true;
    const parentValue = sectionValues[field.dependsOn.field];
    if (field.dependsOn.value === true) return !!parentValue;
    if (field.dependsOn.value === false) return !parentValue;
    return String(parentValue) === String(field.dependsOn.value);
  };

  const isDirty = (fieldName) => {
    return JSON.stringify(sectionValues[fieldName]) !== JSON.stringify(sectionOriginal[fieldName]);
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-medium text-gray-200 mb-1">{section.title}</h2>
      <div className="space-y-1">
        {section.fields.map((field) => {
          if (!isVisible(field)) return null;

          if (field.type === 'string[]') {
            return (
              <div key={field.name} className={`py-2 ${isDirty(field.name) ? 'border-l-2 border-blue-500 pl-3' : 'pl-3'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <label className="text-sm text-gray-300 font-medium">{field.name}</label>
                  {!field.hotReload && (
                    <span className="text-[10px] text-amber-500" title="Requires restart">🔄</span>
                  )}
                  {isDirty(field.name) && <span className="text-[10px] text-blue-400">modified</span>}
                </div>
                {field.description && (
                  <p className="text-[11px] text-gray-500 mb-1.5">{field.description}</p>
                )}
                <ConfigTagInput
                  value={sectionValues[field.name]}
                  onChange={(v) => onUpdateField(section.name, field.name, v)}
                  resolve={field.resolve}
                  resolveIds={resolveIds}
                  field={field}
                />
              </div>
            );
          }

          return (
            <ConfigField
              key={field.name}
              field={field}
              value={sectionValues[field.name]}
              onChange={(v) => onUpdateField(section.name, field.name, v)}
              isDirty={isDirty(field.name)}
            />
          );
        })}

        {/* Tables */}
        {(section.tables || []).map((table) => (
          <div key={table.name} className="mt-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2">{table.title || table.name}</h3>
            <ConfigTable
              table={table}
              value={sectionValues[table.name]}
              onChange={(v) => onUpdateTable(section.name, table.name, v)}
              resolveIds={resolveIds}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create ConfigSidebar.jsx**

Create `src/components/ConfigSidebar.jsx`:

```jsx
export default function ConfigSidebar({ sections, activeSection, onSelect, dirtySections }) {
  return (
    <div className="w-48 border-r border-gray-700 overflow-y-auto shrink-0">
      <div className="py-2">
        {sections.map((section) => (
          <button
            key={section.name}
            onClick={() => onSelect(section.name)}
            className={`w-full text-left px-4 py-1.5 text-sm transition-colors flex items-center justify-between ${
              activeSection === section.name
                ? 'bg-gray-800 text-blue-400 border-r-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
            }`}
          >
            <span className="truncate">{section.title}</span>
            {dirtySections.has(section.name) && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 ml-2" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/ConfigSection.jsx src/components/ConfigSidebar.jsx
git commit -m "feat: add ConfigSection and ConfigSidebar components"
```

---

## Task 7: ConfigEditor Main Component

**Files:**
- Create: `src/components/ConfigEditor.jsx`

- [ ] **Step 1: Create ConfigEditor.jsx**

Create `src/components/ConfigEditor.jsx`:

```jsx
import { useEffect } from 'react';
import ConfigSidebar from './ConfigSidebar';
import ConfigSection from './ConfigSection';
import { useConfig } from '../hooks/useConfig';

export default function ConfigEditor({ apiClient }) {
  const config = useConfig(apiClient);

  // Load config on mount
  useEffect(() => {
    config.load();
  }, [apiClient]);

  if (config.loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Loading configuration...
      </div>
    );
  }

  if (config.error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2">
          <div className="text-red-400">Failed to load config: {config.error}</div>
          <button
            onClick={config.load}
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!config.schema) return null;

  const activeSchemaSection = config.schema.find((s) => s.name === config.activeSection);

  return (
    <div className="flex h-full">
      <ConfigSidebar
        sections={config.schema}
        activeSection={config.activeSection}
        onSelect={config.setActiveSection}
        dirtySections={config.dirtySections}
      />
      <div className="flex-1 overflow-y-auto">
        {activeSchemaSection && (
          <ConfigSection
            section={activeSchemaSection}
            values={config.values[config.activeSection]}
            originalValues={config.originalValues[config.activeSection]}
            onUpdateField={config.updateField}
            onUpdateTable={config.updateTable}
            resolveIds={config.resolveIds}
          />
        )}
      </div>
    </div>
  );
}

// Export the hook result type for App.jsx to use for save/dirty
export { useConfig };
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/ConfigEditor.jsx
git commit -m "feat: add ConfigEditor main component with sidebar and section rendering"
```

---

## Task 8: Wire into App with Tab Navigation

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/TopBar.jsx`
- Modify: `src/components/StatusBar.jsx`

This task adds the top-level tab navigation and wires ConfigEditor into the app.

- [ ] **Step 1: Update TopBar.jsx to add tab navigation**

Replace the content of `src/components/TopBar.jsx`:

```jsx
import TemplateSelector from './TemplateSelector';

export default function TopBar({
  activeTab, onTabChange,
  // DTS props
  templates, currentTemplate, onSelectTemplate,
  onImport, onExport, onSave, connected,
  showMiddle, onToggleMiddle, sendTestButton,
  // Config props
  configDirtyCount, configRestartRequired, onConfigSave,
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-700 text-sm">
      <div className="flex items-center gap-3">
        {/* Tab navigation */}
        <div className="flex gap-1 mr-2">
          <button
            onClick={() => onTabChange('templates')}
            className={`px-3 py-0.5 rounded text-sm font-medium transition-colors ${
              activeTab === 'templates'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-gray-200'
            }`}
          >
            Templates
          </button>
          <button
            onClick={() => onTabChange('config')}
            className={`px-3 py-0.5 rounded text-sm font-medium transition-colors ${
              activeTab === 'config'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-gray-200'
            }`}
          >
            Config
          </button>
        </div>

        {activeTab === 'templates' && (
          <>
            <span className="text-gray-600">|</span>
            <TemplateSelector
              templates={templates}
              currentTemplate={currentTemplate}
              onSelect={onSelectTemplate}
            />
          </>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {activeTab === 'templates' && (
          <>
            {sendTestButton}
            <button onClick={onToggleMiddle}
              className={`px-3 py-0.5 rounded text-sm border border-gray-600 hover:bg-gray-700 ${showMiddle ? 'bg-gray-700 text-blue-300' : 'bg-gray-800 text-gray-400'}`}>
              {showMiddle ? 'Hide Tags' : 'Show Tags'}
            </button>
            {onSave && (
              <button onClick={onSave}
                className="bg-gray-800 text-teal-300 px-3 py-0.5 rounded text-sm border border-gray-600 hover:bg-gray-700"
                title="Save current template to PoracleNG">
                Save
              </button>
            )}
            <button onClick={onImport}
              className="bg-gray-800 text-gray-400 px-3 py-0.5 rounded text-sm border border-gray-600 hover:bg-gray-700"
              title="Import template entry from a JSON file">
              Import
            </button>
            <button onClick={onExport}
              className="bg-gray-800 text-gray-400 px-3 py-0.5 rounded text-sm border border-gray-600 hover:bg-gray-700"
              title="Export current template as a JSON file">
              Export
            </button>
          </>
        )}
        {activeTab === 'config' && onConfigSave && (
          <button onClick={onConfigSave}
            className={`px-3 py-0.5 rounded text-sm border border-gray-600 hover:bg-gray-700 ${
              configDirtyCount > 0
                ? configRestartRequired
                  ? 'bg-amber-900/30 text-amber-300 border-amber-600'
                  : 'bg-gray-800 text-teal-300'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
            }`}
            disabled={configDirtyCount === 0}
            title={configRestartRequired ? 'Some changes require restart' : 'Save config changes'}>
            {configDirtyCount === 0
              ? 'No changes'
              : configRestartRequired
                ? `Save (restart required)`
                : `Save ${configDirtyCount} change${configDirtyCount !== 1 ? 's' : ''}`}
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update StatusBar.jsx to show config dirty count**

In `src/components/StatusBar.jsx`, add a `configDirtyCount` prop. Find the right side of the status bar (near `testScenario`) and add:

Add the `configDirtyCount` prop to the function signature and add this before the closing div of the right side:

```jsx
{configDirtyCount > 0 && (
  <span className="text-blue-400">{configDirtyCount} unsaved config change{configDirtyCount !== 1 ? 's' : ''}</span>
)}
```

- [ ] **Step 3: Update App.jsx to add tab state and ConfigEditor**

In `src/App.jsx`, add:

1. Import ConfigEditor:
```jsx
import ConfigEditor from './components/ConfigEditor';
import { useConfig } from './hooks/useConfig';
```

2. Add state for active tab and config hook:
```jsx
const [activeTab, setActiveTab] = useState('templates');
const config = useConfig(api.connected ? api.client : null);
```

3. Load config when connected and switching to config tab:
```jsx
useEffect(() => {
  if (api.connected && activeTab === 'config' && !config.schema) {
    config.load();
  }
}, [api.connected, activeTab]);
```

4. Add config save handler:
```jsx
const handleConfigSave = useCallback(async () => {
  try {
    const result = await config.save();
    if (result.restart_required) {
      alert(`Saved ${result.saved} change(s). Restart PoracleNG for these to take effect:\n${result.restart_fields?.join('\n') || ''}`);
    } else {
      alert(`Saved ${result.saved} change(s).`);
    }
  } catch (err) {
    alert('Failed to save config: ' + err.message);
  }
}, [config]);
```

5. Update TopBar props:
```jsx
<TopBar
  activeTab={activeTab}
  onTabChange={setActiveTab}
  templates={dts.templates}
  currentTemplate={dts.currentTemplate}
  onSelectTemplate={dts.selectTemplate}
  onImport={handleImport}
  onExport={handleExport}
  onSave={api.connected ? handleSave : null}
  connected={api.connected}
  showMiddle={showMiddle}
  onToggleMiddle={() => setShowMiddle((v) => !v)}
  sendTestButton={api.connected && <SendTestButton onSend={handleSendTest} />}
  configDirtyCount={config.dirtyFields.count}
  configRestartRequired={config.restartRequired.required}
  onConfigSave={api.connected ? handleConfigSave : null}
/>
```

6. Add ConfigEditor below the DTS editor (conditionally rendered):
```jsx
{activeTab === 'templates' ? (
  <div className="flex flex-1 min-h-0">
    {/* ... existing three-panel DTS editor ... */}
  </div>
) : (
  <div className="flex-1 min-h-0">
    <ConfigEditor apiClient={api.client} />
  </div>
)}
```

7. Update StatusBar:
```jsx
<StatusBar
  connected={api.connected}
  url={api.url}
  testScenario={activeTab === 'templates' ? dts.testScenario : null}
  error={activeTab === 'templates' ? (renderError || api.error) : api.error}
  configDirtyCount={activeTab === 'config' ? config.dirtyFields.count : 0}
  onConnect={handleConnect}
  onDisconnect={() => { api.disconnect(); setOfflineMode(false); }}
/>
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Verify the app works**

Run dev server. Connect to PoracleNG. Click "Config" tab. Should see sidebar with sections and form fields for the selected section. Edit a field — should show as dirty (blue left border, "modified" label). Save button should reflect dirty count and restart status.

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx src/components/TopBar.jsx src/components/StatusBar.jsx
git commit -m "feat: wire config editor into app with tab navigation and save"
```

---

## Summary

| Task | Description | Key Files |
|------|-------------|-----------|
| 1 | API client methods | `api-client.js` |
| 2 | useConfig hook (schema, values, dirty, resolve) | `useConfig.js` |
| 3 | ConfigField (type-based renderer) | `ConfigField.jsx` |
| 4 | ConfigTagInput (string[] chips with resolve) | `ConfigTagInput.jsx` |
| 5 | ConfigTable (array-of-tables editor) | `ConfigTable.jsx` |
| 6 | ConfigSection + ConfigSidebar | `ConfigSection.jsx`, `ConfigSidebar.jsx` |
| 7 | ConfigEditor main component | `ConfigEditor.jsx` |
| 8 | App integration (tabs, save, status bar) | `App.jsx`, `TopBar.jsx`, `StatusBar.jsx` |
