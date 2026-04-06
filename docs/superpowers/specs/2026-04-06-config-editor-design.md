# Config Editor — Design Spec

## Overview

Add a configuration editor to the Poracle DTS Editor web app. Allows community admins to view and modify PoracleNG settings through a form-based UI, with changes saved to `config/overrides.json` (never touching config.toml). Hot-reloadable settings take effect immediately; others flag "restart required".

**Audience:** Poracle community admins (same as DTS editor).

**Scope:** Online-only (requires PoracleNG connection). Read config schema + values from API, render form, save partial updates.

## Architecture

The config editor is a new top-level tab alongside the DTS template editor, sharing the connect screen, API client, and status bar.

### API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `GET /api/config/schema` | Field definitions: type, default, description, hotReload, resolve hints, options, dependencies |
| `GET /api/config/values` | Current merged config values (TOML + overrides) |
| `POST /api/config/values` | Save partial updates to overrides.json |
| `POST /api/resolve` | Batch resolve Discord/Telegram IDs to human-readable names |

### Data Flow

1. User switches to Config tab
2. Fetch schema + values in parallel
3. Schema drives form layout; values populate fields
4. For fields with `resolve` hints, batch-resolve IDs via `POST /api/resolve`
5. User edits create dirty state (changed fields tracked)
6. Save sends only dirty fields via `POST /api/config/values`
7. Response indicates `restart_required` — show banner with affected field names

### Component Structure

```
App.jsx — top-level tab switch (Templates / Config)
  ├── ConnectScreen (shared, existing)
  ├── DTS Editor (existing, when Templates tab active)
  └── ConfigEditor (new, when Config tab active)
        ├── ConfigSidebar — section list with active/dirty indicators
        └── ConfigSection — renders fields for selected section
              ├── ConfigField — per-field renderer by type
              ├── ConfigTagInput — tag/chip input for string[] with resolve
              └── ConfigTable — table editor for array-of-tables types
```

## UI Layout

### Top-Level Navigation

A tab bar replaces the "Poracle DTS Editor" title area:

```
[Templates] [Config]                    [Save] [Import] [Export] [Send Test]
```

- "Templates" shows the existing DTS editor
- "Config" shows the configuration editor
- Save/Import/Export/Send Test context changes based on active tab
- When on Config tab: Save saves config changes, Import/Export/Send Test are hidden

### Config Editor Layout

Two-panel: sidebar + section content.

```
┌──────────────┬──────────────────────────────────────────┐
│ Sections     │ Section Title                            │
│              │                                          │
│ ● General    │ Field Label          [input          ]   │
│   Locale     │ Field description text                   │
│   Discord    │                                          │
│   Telegram   │ Select Field                             │
│   Geofence   │ ○ Option A — description                 │
│   PVP        │ ● Option B — description                 │
│   Weather    │ ○ Option C — description                 │
│   Area Sec.  │                                          │
│   Geocoding  │ Array Field                              │
│   Tuning     │ [value1 ×] [value2 ×]  [+ Add]          │
│   Alert Lim. │                                          │
│   Tracking   │ Bool Field  [✓]  🔄                      │
│   Recon.Disc │                                          │
│   ...        │                                          │
├──────────────┴──────────────────────────────────────────┤
│ ● Connected │ 3 unsaved changes │ Save (restart req.)  │
└─────────────────────────────────────────────────────────┘
```

### Sidebar

- Lists all config sections by title
- Active section highlighted
- Sections with unsaved changes show a dot indicator
- Click to switch sections

### Section Content

- Section title at top
- Fields rendered in schema order
- Fields with `dependsOn` hidden when parent field doesn't match the required value
- Adequate spacing between fields for readability

## Field Rendering

### Type → Renderer Mapping

| Schema Type | Renderer | Details |
|-------------|----------|---------|
| `string` | Text input | Monospace font for URLs/paths |
| `int` | Number input | Integer only |
| `float` | Number input | Allows decimals |
| `bool` | Toggle checkbox | Label beside it |
| `select` | Radio group (≤5 options) or dropdown (>5) | Each option shows label + description |
| `string[]` | Tag/chip input | Removable chips, text input to add |
| `map` | Key-value pair editor | Add/remove rows |
| Tables | Row-based card editor | Each row expandable with sub-fields |

### Resolve Display (IDs → Names)

Fields with `resolve` hints contain Discord/Telegram IDs that are meaningless to humans. The editor resolves these to names.

**Display:** Resolved name as primary text, raw ID as small subtitle underneath. For tag chips in `string[]` fields, the chip label shows the resolved name.

**Flow:**
1. When a section loads, collect all values from fields with `resolve` hints
2. Batch into one `POST /api/resolve` call
3. Cache results in component state (API also caches server-side for 10 min)
4. When user adds a new ID to a `string[]` field, resolve it immediately
5. Unresolvable IDs show the raw number only (no error)

**Resolve types** (from schema `resolve` field):
- `discord:user` — Discord user ID → username
- `discord:role` — Discord role ID → role name + guild
- `discord:channel` — Discord channel ID → channel name + guild
- `discord:guild` — Discord guild ID → guild name
- `discord:user|role` — Could be either user or role, try both
- `discord:target` — Could be user or channel
- `telegram:chat` — Telegram chat/user/group ID → name
- `geofence:area` — Geofence area name (no resolution needed, just autocomplete from available areas)

### Sensitive Fields

Fields with `sensitive: true` (API keys, secrets) are returned as `"****"` from the values endpoint. The editor shows a masked input with a reveal toggle. Saving a sensitive field with value `"****"` is a no-op (not included in the update).

### Dependency Hiding

Fields with `dependsOn: {field, value}` are hidden when the parent field's current value doesn't match. When hidden, the field's value is preserved but not shown. Example: `shortlink_provider_url` only visible when `shortlink_provider` is "shlink".

### Restart Indicators

- Fields with `hotReload: false` show a small 🔄 icon next to their label
- Hovering the icon shows "Requires restart to take effect"
- When any dirty field has `hotReload: false`, the save button changes from "Save" to "Save (restart required)"
- After saving, if `restart_required` is true, show a banner: "Saved. Restart PoracleNG for these changes to take effect: [field list]"

## Dirty Tracking

- Each field tracks original value (from API) vs current value
- Only changed fields are included in the save payload
- Status bar shows count: "3 unsaved changes"
- Sidebar sections with changes show a dot indicator
- Switching tabs (Templates ↔ Config) with unsaved config changes shows a warning

## Table Editor

Complex array-of-tables fields (communities, delegated_admins, role_subscriptions, alert_limit overrides) use a card-based editor:

- Each entry shown as a collapsible card
- Card header shows key identifying fields (e.g. community name)
- Click to expand and edit sub-fields
- Sub-fields use the same field renderers as top-level fields (including resolve for IDs)
- "Add" button at bottom creates a new empty entry
- "Remove" button on each card (with confirmation)

## New Files

- `src/components/ConfigEditor.jsx` — main config editor component (sidebar + section)
- `src/components/ConfigSidebar.jsx` — section navigation
- `src/components/ConfigSection.jsx` — renders fields for a section
- `src/components/ConfigField.jsx` — per-field renderer (dispatches by type)
- `src/components/ConfigTagInput.jsx` — tag/chip input for string[] with resolve
- `src/components/ConfigTable.jsx` — table editor for array-of-tables
- `src/hooks/useConfig.js` — fetch schema/values, dirty tracking, save, resolve

## Modified Files

- `src/App.jsx` — add top-level tab navigation (Templates / Config), render ConfigEditor when active
- `src/components/TopBar.jsx` — add tab buttons, context-switch Save/Import/Export
- `src/lib/api-client.js` — add `getConfigSchema()`, `getConfigValues()`, `saveConfigValues()`, `resolve()` methods

## Out of Scope

- Offline config editing (requires API connection)
- Config file upload/download (use overrides.json directly if needed)
- Undo/redo for config changes
- Config diffing (showing what changed from defaults)
- Config validation beyond schema types (e.g. checking if a URL is reachable)
