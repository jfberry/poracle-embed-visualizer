# Poracle DTS Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the forked Discord embed visualizer into a Poracle DTS template editor with form-based editing, Handlebars tag picker, live Discord preview, and optional PoracleNG API integration.

**Architecture:** Upgrade existing React 15 + CRA app to React 18 + Vite in place. Preserve the Discord embed renderer components (porting from createClass to functional). Build new editor UI (form editor, tag picker, test data panel) around them. Handlebars runs in-browser with helpers matching the PoracleNG Go backend exactly. Optional API connection for enriched test data and template management.

**Tech Stack:** React 18, Vite, Handlebars.js, CodeMirror 6, Tailwind CSS

**Reference files:**
- Design spec: `docs/superpowers/specs/2026-04-05-poracle-dts-editor-design.md`
- Go backend helpers: `~/GolandProjects/PoracleNG/processor/internal/dts/helpers.go`
- Go backend game helpers: `~/GolandProjects/PoracleNG/processor/internal/dts/helpers_game.go`
- Go backend API: `~/GolandProjects/PoracleNG/processor/internal/api/dts.go`
- Default DTS templates: `~/dev/PoracleJs/config/defaults/dts.json`
- Test data: `~/dev/PoracleJs/config/defaults/testdata.json`
- DTS field reference: `~/GolandProjects/PoracleNG/DTS.md`

---

## File Structure

### Existing files to modify (upgrade React API)
- `src/components/embed.jsx` → functional components (already mostly functional, minor cleanup)
- `src/components/discordview.jsx` → convert `React.createClass` to functional + hooks
- `src/components/markdown.jsx` → keep as-is (pure functions), update imports if needed
- `src/color.js` → keep as-is
- `src/constants/emoji.js` → keep as-is
- `src/css/discord.css` → keep as-is (Discord preview styles)

### Existing files to delete
- `src/components/app.jsx` — replaced by new App
- `src/components/codemirror.jsx` — replaced by CM6 wrapper
- `src/components/codemodal.jsx` — not needed (code generation for other libraries)
- `src/components/aboutmodal.jsx` — replaced by new about content
- `src/components/warningmodal.jsx` — not needed
- `src/snippets/*` — not needed (code generation for other libraries)
- `src/constants/embedschema.js` — replaced by Poracle DTS schema
- `src/validation.js` — replaced by Poracle validation

### New files to create
- `vite.config.js` — Vite configuration
- `tailwind.config.js` — Tailwind configuration
- `postcss.config.js` — PostCSS for Tailwind
- `index.html` — Vite entry point (moved from `public/`)
- `src/main.jsx` — new entry point
- `src/App.jsx` — main app component (three-panel layout, state management)
- `src/components/TopBar.jsx` — DTS filter bar, file actions, API connection
- `src/components/TemplateEditor.jsx` — left panel: form/raw toggle, form fields
- `src/components/FormEditor.jsx` — structured form for embed fields
- `src/components/RawEditor.jsx` — CodeMirror 6 wrapper for raw JSON
- `src/components/TagPicker.jsx` — middle panel: available fields grouped by category
- `src/components/TestDataPanel.jsx` — middle panel: test data editor with scenario picker
- `src/components/DiscordPreview.jsx` — right panel: wraps existing DiscordView
- `src/components/StatusBar.jsx` — bottom bar: connection status, errors
- `src/lib/handlebars-helpers.js` — all Handlebars helpers matching Go backend
- `src/lib/handlebars-game-helpers.js` — game-data-dependent helpers (dummy implementations)
- `src/lib/handlebars-engine.js` — compile + render templates with registered helpers
- `src/lib/dts-schema.js` — DTS entry validation and parsing
- `src/lib/field-definitions.js` — field metadata for all DTS types (from DTS.md)
- `src/lib/api-client.js` — PoracleNG API client (optional connection)
- `src/data/test-data.js` — static enriched test data snapshots for standalone mode
- `src/data/default-dts.js` — default DTS templates (from PoracleJs defaults)
- `src/hooks/useHandlebars.js` — hook for template compilation + rendering
- `src/hooks/useApi.js` — hook for API connection state
- `src/hooks/useDts.js` — hook for DTS file loading/saving/filtering
- `src/css/editor.css` — Tailwind entry point + custom editor styles

### Test files
- `src/lib/__tests__/handlebars-helpers.test.js` — helper parity tests
- `src/lib/__tests__/handlebars-engine.test.js` — template compilation tests
- `src/lib/__tests__/dts-schema.test.js` — DTS parsing/validation tests
- `src/lib/__tests__/field-definitions.test.js` — field metadata tests

---

## Task 1: Upgrade to Vite + React 18

**Files:**
- Delete: `src/index.js`
- Create: `vite.config.js`, `index.html`, `src/main.jsx`
- Modify: `package.json`

- [ ] **Step 1: Remove old dependencies and scripts**

```bash
npm remove react-scripts rimraf
npm remove react react-dom react-addons-css-transition-group
npm remove ajv codemirror highlight.js lodash.debounce moment react-color simple-markdown twemoji
```

- [ ] **Step 2: Install Vite + React 18**

```bash
npm install react@18 react-dom@18
npm install -D vite @vitejs/plugin-react
```

- [ ] **Step 3: Create `vite.config.js`**

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 3000 },
});
```

- [ ] **Step 4: Move and update `index.html`**

Move `public/index.html` to project root. Replace the CRA `%PUBLIC_URL%` references and add the Vite entry point:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Poracle DTS Editor</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
```

- [ ] **Step 5: Create `src/main.jsx`**

```jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const root = createRoot(document.getElementById('root'));
root.render(<App />);
```

- [ ] **Step 6: Create placeholder `src/App.jsx`**

```jsx
export default function App() {
  return <div>Poracle DTS Editor — Vite works!</div>;
}
```

- [ ] **Step 7: Update `package.json` scripts**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest"
  }
}
```

- [ ] **Step 8: Verify dev server starts**

Run: `npm run dev`
Expected: Vite dev server at localhost:3000 showing "Poracle DTS Editor — Vite works!"

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: upgrade to Vite + React 18, replace CRA"
```

---

## Task 2: Add Tailwind CSS

**Files:**
- Create: `tailwind.config.js`, `postcss.config.js`, `src/css/editor.css`

- [ ] **Step 1: Install Tailwind**

```bash
npm install -D tailwindcss @tailwindcss/postcss postcss
```

- [ ] **Step 2: Create `postcss.config.js`**

```js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

- [ ] **Step 3: Create `src/css/editor.css`**

```css
@import "tailwindcss";
```

- [ ] **Step 4: Import in `src/main.jsx`**

Add to the top of `src/main.jsx`:

```jsx
import './css/editor.css';
```

- [ ] **Step 5: Verify Tailwind works**

Update `src/App.jsx` to use a Tailwind class:

```jsx
export default function App() {
  return <div className="bg-gray-900 text-white min-h-screen p-4">Poracle DTS Editor — Tailwind works!</div>;
}
```

Run: `npm run dev`
Expected: Dark background, white text.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Tailwind CSS"
```

---

## Task 3: Port Discord Renderer to React 18

**Files:**
- Modify: `src/components/discordview.jsx`, `src/components/embed.jsx`
- Reinstall: `moment`, `simple-markdown`, `highlight.js`, `twemoji`

The Discord renderer components (`embed.jsx`, `markdown.jsx`, `discordview.jsx`) and their CSS (`discord.css`) are the core value from the fork. We port them to React 18 functional components while preserving all rendering logic.

- [ ] **Step 1: Reinstall renderer dependencies**

```bash
npm install moment simple-markdown highlight.js twemoji
```

- [ ] **Step 2: Port `discordview.jsx` from createClass to functional**

Replace the entire file. The `MessageTimestamp` component needs `useState`/`useEffect` for the timer. The `DiscordView` component becomes a functional component with default props.

```jsx
import React, { useState, useEffect } from 'react';
import Moment from 'moment';
import Embed from './embed';
import { parse, parseAllowLinks, jumboify } from './markdown';

function MessageTimestamp({ compactMode = false }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  const m = Moment();
  const computed = compactMode ? m.format('LT') : m.calendar();
  return <span className="timestamp">{computed}</span>;
}

function MessageBody({ compactMode, username, content, webhookMode }) {
  if (compactMode) {
    return (
      <div className="markup">
        <MessageTimestamp compactMode={compactMode} />
        <span className="username-wrapper v-btm">
          <strong className="user-name">{username}</strong>
          <span className="bot-tag">BOT</span>
        </span>
        <span className="highlight-separator"> - </span>
        <span className="message-content">
          {content && parse(content, true, {}, jumboify)}
        </span>
      </div>
    );
  } else if (content) {
    if (webhookMode) {
      return (
        <div className="markup">
          {parseAllowLinks(content, true, {}, jumboify)}
        </div>
      );
    }
    return (
      <div className="markup">{parse(content, true, {}, jumboify)}</div>
    );
  }
  return null;
}

function CozyMessageHeader({ compactMode, username }) {
  if (compactMode) return null;
  return (
    <h2 style={{ lineHeight: '16px' }}>
      <span className="username-wrapper v-btm">
        <strong className="user-name">{username}</strong>
        <span className="bot-tag">BOT</span>
      </span>
      <span className="highlight-separator"> - </span>
      <MessageTimestamp compactMode={compactMode} />
    </h2>
  );
}

function Avatar({ compactMode, url }) {
  if (compactMode) return null;
  return (
    <div
      className="avatar-large animate"
      style={{ backgroundImage: `url('${url}')` }}
    />
  );
}

function ErrorHeader({ error }) {
  if (!error) return null;
  return (
    <header className="f6 bg-red br2 pa2 br--top w-100 code pre-wrap">
      {error}
    </header>
  );
}

function DiscordViewWrapper({ darkTheme, children }) {
  return (
    <div className="w-100 h-100 overflow-auto pa2 discord-view">
      <div className={`flex-vertical whitney ${darkTheme ? 'theme-dark' : ''}`}>
        <div className="chat flex-vertical flex-spacer">
          <div className="content flex-spacer flex-horizontal">
            <div className="flex-spacer flex-vertical messages-wrapper">
              <div className="scroller-wrap">
                <div className="scroller messages">{children}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DiscordView({
  username = 'Poracle',
  avatar_url = 'https://cdn.discordapp.com/embed/avatars/0.png',
  darkTheme = true,
  compactMode = false,
  webhookMode = false,
  error = null,
  data = {},
}) {
  const { content, embed, embeds } = data;
  const bgColor = darkTheme ? 'bg-discord-dark' : 'bg-discord-light';
  const cls = `w-100 h-100 br2 flex flex-column white overflow-hidden ${bgColor}`;

  return (
    <div className={cls}>
      <ErrorHeader error={error} />
      <DiscordViewWrapper darkTheme={darkTheme}>
        <div
          className={`message-group hide-overflow ${compactMode ? 'compact' : ''}`}
        >
          <Avatar url={avatar_url} compactMode={compactMode} />
          <div className="comment">
            <div className="message first">
              <CozyMessageHeader
                username={username}
                compactMode={compactMode}
              />
              <div className="message-text">
                <MessageBody
                  content={content}
                  username={username}
                  compactMode={compactMode}
                  webhookMode={webhookMode}
                />
              </div>
              {embed ? (
                <Embed {...embed} />
              ) : (
                embeds &&
                embeds.map((e, i) => <Embed key={i} {...e} />)
              )}
            </div>
          </div>
        </div>
      </DiscordViewWrapper>
    </div>
  );
}
```

- [ ] **Step 3: Import Discord CSS in `src/main.jsx`**

Add these imports to `src/main.jsx` (after the editor.css import):

```jsx
import './css/discord.css';
import './css/tachyons.css';
```

- [ ] **Step 4: Verify renderer works with hardcoded data**

Update `src/App.jsx` to render a test embed:

```jsx
import DiscordView from './components/discordview';

const testData = {
  content: 'Test message',
  embed: {
    title: '95.56% Magikarp cp:212 L:27 15/15/15',
    description: 'End: 14:33, Time left: 10m 0s\n123 Example Street\nquick: Splash, charge: Struggle',
    color: 16750848,
    thumbnail: { url: 'https://raw.githubusercontent.com/nileplumb/PkmnHomeIcons/master/RDM_OS_128/pokemon/129.png' },
  },
};

export default function App() {
  return (
    <div className="bg-gray-900 min-h-screen p-4">
      <div style={{ maxWidth: 600 }}>
        <DiscordView data={testData} darkTheme={true} />
      </div>
    </div>
  );
}
```

Run: `npm run dev`
Expected: Discord-style embed preview with Magikarp title, orange color pill, thumbnail image.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: port Discord renderer to React 18 functional components"
```

---

## Task 4: Handlebars Helpers — Comparison and Math

**Files:**
- Create: `src/lib/handlebars-helpers.js`, `src/lib/__tests__/handlebars-helpers.test.js`
- Install: `handlebars`, `vitest`

These helpers must match the Go backend (`~/GolandProjects/PoracleNG/processor/internal/dts/helpers.go`) exactly in behavior. We implement them in tiers, starting with comparison and math.

- [ ] **Step 1: Install Handlebars and Vitest**

```bash
npm install handlebars
npm install -D vitest
```

- [ ] **Step 2: Write failing tests for comparison helpers**

Create `src/lib/__tests__/handlebars-helpers.test.js`:

```js
import { describe, it, expect, beforeAll } from 'vitest';
import Handlebars from 'handlebars';
import { registerAllHelpers } from '../handlebars-helpers';

let hbs;

beforeAll(() => {
  hbs = Handlebars.create();
  registerAllHelpers(hbs);
});

function render(template, context = {}) {
  return hbs.compile(template)(context);
}

describe('comparison helpers', () => {
  describe('eq', () => {
    it('renders block when equal', () => {
      expect(render('{{#eq a "hello"}}yes{{else}}no{{/eq}}', { a: 'hello' })).toBe('yes');
    });
    it('renders inverse when not equal', () => {
      expect(render('{{#eq a "hello"}}yes{{else}}no{{/eq}}', { a: 'world' })).toBe('no');
    });
    it('compares numbers as strings', () => {
      expect(render('{{#eq a 5}}yes{{else}}no{{/eq}}', { a: 5 })).toBe('yes');
    });
  });

  describe('ne / isnt', () => {
    it('renders block when not equal', () => {
      expect(render('{{#ne a "x"}}yes{{else}}no{{/ne}}', { a: 'y' })).toBe('yes');
    });
    it('isnt is alias for ne', () => {
      expect(render('{{#isnt a "x"}}yes{{else}}no{{/isnt}}', { a: 'y' })).toBe('yes');
    });
  });

  describe('compare', () => {
    it('handles == operator', () => {
      expect(render('{{#compare a "==" b}}yes{{else}}no{{/compare}}', { a: 5, b: 5 })).toBe('yes');
    });
    it('handles < operator', () => {
      expect(render('{{#compare a "<" b}}yes{{else}}no{{/compare}}', { a: 3, b: 5 })).toBe('yes');
    });
    it('handles >= operator', () => {
      expect(render('{{#compare a ">=" b}}yes{{else}}no{{/compare}}', { a: 5, b: 5 })).toBe('yes');
    });
  });

  describe('gt/gte/lt/lte', () => {
    it('gt true when greater', () => {
      expect(render('{{#gt a b}}yes{{else}}no{{/gt}}', { a: 5, b: 3 })).toBe('yes');
    });
    it('lte true when equal', () => {
      expect(render('{{#lte a b}}yes{{else}}no{{/lte}}', { a: 5, b: 5 })).toBe('yes');
    });
  });

  describe('and/or/neither/not', () => {
    it('and requires all truthy', () => {
      expect(render('{{#and a b}}yes{{else}}no{{/and}}', { a: 1, b: 1 })).toBe('yes');
      expect(render('{{#and a b}}yes{{else}}no{{/and}}', { a: 1, b: 0 })).toBe('no');
    });
    it('or requires any truthy', () => {
      expect(render('{{#or a b}}yes{{else}}no{{/or}}', { a: 0, b: 1 })).toBe('yes');
    });
    it('neither requires none truthy', () => {
      expect(render('{{#neither a b}}yes{{else}}no{{/neither}}', { a: 0, b: 0 })).toBe('yes');
    });
    it('not negates', () => {
      expect(render('{{#not a}}yes{{else}}no{{/not}}', { a: false })).toBe('yes');
    });
  });

  describe('contains', () => {
    it('string contains', () => {
      expect(render('{{#contains a "ell"}}yes{{else}}no{{/contains}}', { a: 'hello' })).toBe('yes');
    });
    it('array contains', () => {
      expect(render('{{#contains a "b"}}yes{{else}}no{{/contains}}', { a: ['a', 'b', 'c'] })).toBe('yes');
    });
  });

  describe('default', () => {
    it('returns value when truthy', () => {
      expect(render('{{default a "fallback"}}', { a: 'real' })).toBe('real');
    });
    it('returns default when falsy', () => {
      expect(render('{{default a "fallback"}}', { a: '' })).toBe('fallback');
    });
  });
});

describe('math helpers', () => {
  it('round', () => {
    expect(render('{{round a}}', { a: 3.7 })).toBe('4');
  });
  it('floor', () => {
    expect(render('{{floor a}}', { a: 3.7 })).toBe('3');
  });
  it('ceil', () => {
    expect(render('{{ceil a}}', { a: 3.2 })).toBe('4');
  });
  it('add / plus', () => {
    expect(render('{{add a b}}', { a: 3, b: 4 })).toBe('7');
    expect(render('{{plus a b}}', { a: 3, b: 4 })).toBe('7');
  });
  it('subtract / minus', () => {
    expect(render('{{subtract a b}}', { a: 10, b: 3 })).toBe('7');
    expect(render('{{minus a b}}', { a: 10, b: 3 })).toBe('7');
  });
  it('multiply', () => {
    expect(render('{{multiply a b}}', { a: 3, b: 4 })).toBe('12');
  });
  it('divide', () => {
    expect(render('{{divide a b}}', { a: 10, b: 4 })).toBe('2.5');
  });
  it('divide by zero returns 0', () => {
    expect(render('{{divide a b}}', { a: 10, b: 0 })).toBe('0');
  });
  it('toFixed', () => {
    expect(render('{{toFixed a 2}}', { a: 3.14159 })).toBe('3.14');
  });
  it('toInt', () => {
    expect(render('{{toInt a}}', { a: 3.7 })).toBe('3');
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/handlebars-helpers.test.js`
Expected: FAIL — `registerAllHelpers` not found.

- [ ] **Step 4: Implement comparison and math helpers**

Create `src/lib/handlebars-helpers.js`:

```js
// Handlebars helpers matching PoracleNG Go backend exactly.
// Reference: ~/GolandProjects/PoracleNG/processor/internal/dts/helpers.go

function toFloat(v) {
  if (v == null) return 0;
  if (typeof v === 'boolean') return v ? 1 : 0;
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}

function toBool(v) {
  if (v == null) return false;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') return v !== '';
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v).length > 0;
  return !!v;
}

function toString(v) {
  if (v == null) return '';
  return String(v);
}

function boolResult(result, options) {
  if (!options.fn) return result;
  return result ? options.fn(this) : options.inverse(this);
}

function evalCompare(a, op, b) {
  switch (op) {
    case '==': return String(a) === String(b);
    case '!=': return String(a) !== String(b);
    case '<': return toFloat(a) < toFloat(b);
    case '>': return toFloat(a) > toFloat(b);
    case '<=': return toFloat(a) <= toFloat(b);
    case '>=': return toFloat(a) >= toFloat(b);
    default: return false;
  }
}

function registerComparisonHelpers(hbs) {
  hbs.registerHelper('eq', function (a, b, options) {
    return boolResult.call(this, String(a) === String(b), options);
  });

  hbs.registerHelper('ne', function (a, b, options) {
    return boolResult.call(this, String(a) !== String(b), options);
  });

  hbs.registerHelper('isnt', function (a, b, options) {
    return boolResult.call(this, String(a) !== String(b), options);
  });

  hbs.registerHelper('compare', function (a, op, b, options) {
    return boolResult.call(this, evalCompare(a, op, b), options);
  });

  hbs.registerHelper('gt', function (a, b, options) {
    return boolResult.call(this, toFloat(a) > toFloat(b), options);
  });

  hbs.registerHelper('gte', function (a, b, options) {
    return boolResult.call(this, toFloat(a) >= toFloat(b), options);
  });

  hbs.registerHelper('lt', function (a, b, options) {
    return boolResult.call(this, toFloat(a) < toFloat(b), options);
  });

  hbs.registerHelper('lte', function (a, b, options) {
    return boolResult.call(this, toFloat(a) <= toFloat(b), options);
  });

  hbs.registerHelper('and', function (...args) {
    const options = args.pop();
    const result = args.every((a) => toBool(a));
    return boolResult.call(this, result, options);
  });

  hbs.registerHelper('or', function (...args) {
    const options = args.pop();
    const result = args.some((a) => toBool(a));
    return boolResult.call(this, result, options);
  });

  hbs.registerHelper('neither', function (...args) {
    const options = args.pop();
    const result = !args.some((a) => toBool(a));
    return boolResult.call(this, result, options);
  });

  hbs.registerHelper('not', function (value, options) {
    if (!toBool(value)) return options.fn(this);
    return options.inverse(this);
  });

  hbs.registerHelper('contains', function (collection, value, options) {
    let found = false;
    if (typeof collection === 'string') {
      found = collection.includes(toString(value));
    } else if (Array.isArray(collection)) {
      found = collection.some((item) => toString(item) === toString(value));
    }
    if (found) return options.fn(this);
    return options.inverse(this);
  });

  hbs.registerHelper('default', function (value, defaultValue) {
    return toBool(value) ? toString(value) : toString(defaultValue);
  });
}

function registerMathHelpers(hbs) {
  hbs.registerHelper('round', (n) => Math.round(toFloat(n)));
  hbs.registerHelper('floor', (n) => Math.floor(toFloat(n)));
  hbs.registerHelper('ceil', (n) => Math.ceil(toFloat(n)));
  hbs.registerHelper('add', (a, b) => toFloat(a) + toFloat(b));
  hbs.registerHelper('plus', (a, b) => toFloat(a) + toFloat(b));
  hbs.registerHelper('subtract', (a, b) => toFloat(a) - toFloat(b));
  hbs.registerHelper('minus', (a, b) => toFloat(a) - toFloat(b));
  hbs.registerHelper('multiply', (a, b) => toFloat(a) * toFloat(b));
  hbs.registerHelper('divide', (a, b) => {
    const bv = toFloat(b);
    return bv === 0 ? 0 : toFloat(a) / bv;
  });
  hbs.registerHelper('toFixed', (n, decimals) => toFloat(n).toFixed(toFloat(decimals)));
  hbs.registerHelper('toInt', (n) => Math.trunc(toFloat(n)));
}

function registerStringHelpers(hbs) {
  hbs.registerHelper('uppercase', (s) => toString(s).toUpperCase());
  hbs.registerHelper('lowercase', (s) => toString(s).toLowerCase());
  hbs.registerHelper('capitalize', (s) => {
    const str = toString(s);
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
  });
  hbs.registerHelper('replace', (s, old, _new) =>
    toString(s).replaceAll(toString(old), toString(_new))
  );
  hbs.registerHelper('truncate', function (s, length, options) {
    const str = toString(s);
    const maxLen = toFloat(length);
    const suffix = options.hash?.suffix ?? '...';
    if (str.length <= maxLen) return str;
    if (maxLen <= suffix.length) return suffix.slice(0, maxLen);
    return str.slice(0, maxLen - suffix.length) + suffix;
  });
  hbs.registerHelper('concat', function (...args) {
    // Last arg is options object from Handlebars
    if (args.length > 0 && typeof args[args.length - 1] === 'object' && args[args.length - 1].name === 'concat') {
      args.pop();
    }
    return args.map(toString).join('');
  });
  hbs.registerHelper('replaceFirst', (s, old, _new) =>
    toString(s).replace(toString(old), toString(_new))
  );
}

function registerArrayHelpers(hbs) {
  // Override built-in each to inject isFirst/isLast into context (PoracleJS compat)
  hbs.registerHelper('each', function (context, options) {
    if (!context || (Array.isArray(context) && context.length === 0)) {
      return options.inverse(this);
    }
    if (Array.isArray(context)) {
      let result = '';
      for (let i = 0; i < context.length; i++) {
        const item = typeof context[i] === 'object' && context[i] !== null
          ? { ...context[i], isFirst: i === 0, isLast: i === context.length - 1 }
          : context[i];
        const data = {
          index: i,
          first: i === 0,
          last: i === context.length - 1,
        };
        result += options.fn(item, { data });
      }
      return result;
    }
    if (typeof context === 'object') {
      const keys = Object.keys(context);
      if (keys.length === 0) return options.inverse(this);
      let result = '';
      keys.forEach((key, i) => {
        const item = typeof context[key] === 'object' && context[key] !== null
          ? { ...context[key], isFirst: i === 0, isLast: i === keys.length - 1 }
          : context[key];
        const data = { index: i, key, first: i === 0, last: i === keys.length - 1 };
        result += options.fn(item, { data });
      });
      return result;
    }
    return options.inverse(this);
  });

  hbs.registerHelper('forEach', function (context, options) {
    if (!Array.isArray(context) || context.length === 0) {
      return options.inverse(this);
    }
    let result = '';
    for (let i = 0; i < context.length; i++) {
      const item = typeof context[i] === 'object' && context[i] !== null
        ? { ...context[i], isFirst: i === 0, isLast: i === context.length - 1 }
        : context[i];
      const data = {
        index: i,
        first: i === 0,
        last: i === context.length - 1,
        total: context.length,
      };
      result += options.fn(item, { data });
    }
    return result;
  });

  hbs.registerHelper('first', function (arr, options) {
    if (!Array.isArray(arr) || arr.length === 0) return '';
    const n = options.hash?.n ? toFloat(options.hash.n) : 1;
    if (n <= 0) return '';
    if (n === 1) return arr[0];
    return arr.slice(0, n);
  });

  hbs.registerHelper('last', function (arr, options) {
    if (!Array.isArray(arr) || arr.length === 0) return '';
    const n = options.hash?.n ? toFloat(options.hash.n) : 1;
    if (n <= 0) return '';
    if (n === 1) return arr[arr.length - 1];
    return arr.slice(-n);
  });

  hbs.registerHelper('length', (v) => {
    if (v == null) return 0;
    if (Array.isArray(v) || typeof v === 'string') return v.length;
    if (typeof v === 'object') return Object.keys(v).length;
    return 0;
  });

  hbs.registerHelper('join', (arr, sep) => {
    if (!Array.isArray(arr)) return toString(arr);
    return arr.map(toString).join(toString(sep));
  });
}

function registerFormattingHelpers(hbs) {
  hbs.registerHelper('numberFormat', (value, decimals) =>
    toFloat(value).toFixed(toFloat(decimals))
  );
  hbs.registerHelper('pad0', (value, width) => {
    const w = toFloat(width) || 3;
    return String(Math.trunc(toFloat(value))).padStart(w, '0');
  });
  hbs.registerHelper('addCommas', (value) => {
    const n = Math.trunc(toFloat(value));
    return n.toLocaleString('en-US');
  });
  hbs.registerHelper('escape', (s) => {
    return toString(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  });
}

export function registerAllHelpers(hbs) {
  registerComparisonHelpers(hbs);
  registerMathHelpers(hbs);
  registerStringHelpers(hbs);
  registerArrayHelpers(hbs);
  registerFormattingHelpers(hbs);
}
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/lib/__tests__/handlebars-helpers.test.js`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: implement Handlebars helpers matching Go backend (comparison, math, string, array, formatting)"
```

---

## Task 5: Handlebars Game Helpers (Dummy Implementations)

**Files:**
- Create: `src/lib/handlebars-game-helpers.js`
- Modify: `src/lib/__tests__/handlebars-helpers.test.js`

Game helpers need game data that only exists on the backend. We implement dummy versions that return placeholder values. When the API provides enriched variable maps, these are rarely called — the pre-computed fields (`fullName`, `quickMoveName`, etc.) are already in the context.

- [ ] **Step 1: Write failing tests for game helpers**

Append to `src/lib/__tests__/handlebars-helpers.test.js`:

```js
import { registerGameHelpers } from '../handlebars-game-helpers';

describe('game helpers (dummy implementations)', () => {
  let ghbs;

  beforeAll(() => {
    ghbs = Handlebars.create();
    registerAllHelpers(ghbs);
    registerGameHelpers(ghbs);
  });

  function grender(template, context = {}) {
    return ghbs.compile(template)(context);
  }

  it('pokemonName returns ID as string', () => {
    expect(grender('{{pokemonName 129}}')).toBe('Pokemon #129');
  });

  it('pokemonNameEng returns ID as string', () => {
    expect(grender('{{pokemonNameEng 129}}')).toBe('Pokemon #129');
  });

  it('moveName returns placeholder', () => {
    expect(grender('{{moveName 123}}')).toBe('Move #123');
  });

  it('moveType returns placeholder', () => {
    expect(grender('{{moveType 123}}')).toBe('Type');
  });

  it('getEmoji returns key as-is', () => {
    expect(grender('{{getEmoji "fire_emoji"}}')).toBe('fire_emoji');
  });

  it('pokemon block helper provides context', () => {
    const result = grender('{{#pokemon 129 0}}{{name}} {{hasEvolutions}}{{/pokemon}}');
    expect(result).toBe('Pokemon #129 false');
  });

  it('getPowerUpCost block mode', () => {
    const result = grender('{{#getPowerUpCost 20 40}}{{stardust}}{{/getPowerUpCost}}');
    expect(result).toBe('0');
  });

  it('calculateCp returns 10', () => {
    expect(grender('{{calculateCp stats 25 15 15 15}}', { stats: { baseAttack: 0, baseDefense: 0, baseStamina: 0 } })).toBe('10');
  });

  it('map returns value as-is', () => {
    expect(grender('{{map "areamap" "key1"}}')).toBe('key1');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/handlebars-helpers.test.js`
Expected: FAIL — `registerGameHelpers` not found.

- [ ] **Step 3: Implement dummy game helpers**

Create `src/lib/handlebars-game-helpers.js`:

```js
// Dummy implementations of game-data-dependent Handlebars helpers.
// These match the Go backend's helper signatures but return placeholder values.
// When the PoracleNG API provides enriched variable maps, the pre-computed fields
// (fullName, quickMoveName, etc.) are already in the context, so these helpers
// are rarely invoked in practice.

export function registerGameHelpers(hbs) {
  // Pokemon name helpers
  hbs.registerHelper('pokemonName', (id) => `Pokemon #${id}`);
  hbs.registerHelper('pokemonNameEng', (id) => `Pokemon #${id}`);
  hbs.registerHelper('pokemonNameAlt', (id) => `Pokemon #${id}`);
  hbs.registerHelper('pokemonForm', (formId) => `Form #${formId}`);
  hbs.registerHelper('pokemonFormEng', (formId) => `Form #${formId}`);
  hbs.registerHelper('pokemonFormAlt', (formId) => `Form #${formId}`);

  // pokemon block helper
  hbs.registerHelper('pokemon', function (id, form, options) {
    // If form is options (2-arg call), shift
    if (typeof form === 'object' && form.fn) {
      options = form;
      form = 0;
    }
    const ctx = {
      name: `Pokemon #${id}`,
      nameEng: `Pokemon #${id}`,
      formName: '',
      formNameEng: '',
      fullName: `Pokemon #${id}`,
      fullNameEng: `Pokemon #${id}`,
      typeName: [],
      typeNameEng: [],
      typeEmoji: [],
      baseStats: { baseAttack: 0, baseDefense: 0, baseStamina: 0 },
      hasEvolutions: false,
    };
    return options.fn(ctx);
  });

  hbs.registerHelper('pokemonBaseStats', () => ({
    baseAttack: 0,
    baseDefense: 0,
    baseStamina: 0,
  }));

  // Move helpers
  hbs.registerHelper('moveName', (id) => `Move #${id}`);
  hbs.registerHelper('moveNameEng', (id) => `Move #${id}`);
  hbs.registerHelper('moveNameAlt', (id) => `Move #${id}`);
  hbs.registerHelper('moveType', () => 'Type');
  hbs.registerHelper('moveTypeEng', () => 'Type');
  hbs.registerHelper('moveTypeAlt', () => 'Type');
  hbs.registerHelper('moveEmoji', () => '');
  hbs.registerHelper('moveEmojiEng', () => '');
  hbs.registerHelper('moveEmojiAlt', () => '');

  // Emoji
  hbs.registerHelper('getEmoji', (key) => String(key));
  hbs.registerHelper('translateAlt', (text) => String(text));

  // Power-up cost
  hbs.registerHelper('getPowerUpCost', function (startLevel, endLevel, options) {
    const result = { stardust: 0, candy: 0, xlCandy: 0 };
    const rendered = options.fn(result);
    return rendered || '0 stardust, 0 candy, 0 XL candy';
  });

  // CP calculation (dummy — returns 10)
  hbs.registerHelper('calculateCp', () => 10);

  // Custom maps (return value as-is)
  hbs.registerHelper('map', (_name, value) => String(value));
  hbs.registerHelper('map2', (_name, value) => String(value));
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/__tests__/handlebars-helpers.test.js`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add dummy game-data Handlebars helpers for standalone mode"
```

---

## Task 6: Handlebars Engine (Compile + Render)

**Files:**
- Create: `src/lib/handlebars-engine.js`, `src/lib/__tests__/handlebars-engine.test.js`

- [ ] **Step 1: Write failing tests**

Create `src/lib/__tests__/handlebars-engine.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { createEngine, renderTemplate } from '../handlebars-engine';

describe('handlebars engine', () => {
  const engine = createEngine();

  it('renders a simple template', () => {
    const result = renderTemplate(engine, '{{name}} cp:{{cp}}', { name: 'Magikarp', cp: 212 });
    expect(result).toBe('Magikarp cp:212');
  });

  it('renders a DTS embed template to JSON', () => {
    const template = JSON.stringify({
      embed: {
        title: '{{name}} cp:{{cp}}',
        description: 'IV: {{iv}}%',
        color: '{{color}}',
      },
    });
    const data = { name: 'Magikarp', cp: 212, iv: 100, color: 16750848 };
    const result = renderTemplate(engine, template, data);
    const parsed = JSON.parse(result);
    expect(parsed.embed.title).toBe('Magikarp cp:212');
    expect(parsed.embed.description).toBe('IV: 100%');
  });

  it('handles nested objects in context', () => {
    const result = renderTemplate(engine, '{{genderData.name}} {{genderData.emoji}}', {
      genderData: { name: 'Male', emoji: '♂' },
    });
    expect(result).toBe('Male ♂');
  });

  it('handles each with sub-fields', () => {
    const result = renderTemplate(engine, '{{#each pvpGreat}}#{{rank}} {{/each}}', {
      pvpGreat: [{ rank: 1 }, { rank: 26 }],
    });
    expect(result).toBe('#1 #26 ');
  });

  it('uses custom helpers', () => {
    const result = renderTemplate(engine, '{{round iv}}%', { iv: 95.556 });
    expect(result).toBe('96%');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/handlebars-engine.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the engine**

Create `src/lib/handlebars-engine.js`:

```js
import Handlebars from 'handlebars';
import { registerAllHelpers } from './handlebars-helpers';
import { registerGameHelpers } from './handlebars-game-helpers';

/**
 * Create a Handlebars instance with all Poracle helpers registered.
 * Returns an isolated instance so multiple engines don't interfere.
 */
export function createEngine() {
  const hbs = Handlebars.create();
  registerAllHelpers(hbs);
  registerGameHelpers(hbs);
  return hbs;
}

/**
 * Compile and render a Handlebars template string against a data context.
 * Returns the rendered string.
 */
export function renderTemplate(engine, templateStr, data) {
  const compiled = engine.compile(templateStr, { noEscape: true });
  return compiled(data);
}

/**
 * Render a DTS template entry against test data.
 * Takes the template object (e.g. { embed: { title: "{{name}}", ... } }),
 * stringifies it, renders through Handlebars, then parses the result back.
 * Returns the rendered object (ready for the Discord renderer) or null on error.
 */
export function renderDtsTemplate(engine, templateObj, data) {
  const templateStr = JSON.stringify(templateObj);
  const rendered = renderTemplate(engine, templateStr, data);
  try {
    return JSON.parse(rendered);
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/__tests__/handlebars-engine.test.js`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Handlebars engine with template compilation and DTS rendering"
```

---

## Task 7: Field Definitions and Test Data

**Files:**
- Create: `src/lib/field-definitions.js`, `src/data/test-data.js`, `src/data/default-dts.js`

This task creates the static data that powers standalone mode: field metadata for the tag picker, sample enriched variable maps, and default DTS templates.

- [ ] **Step 1: Create field definitions**

Create `src/lib/field-definitions.js`. This is derived from `~/GolandProjects/PoracleNG/DTS.md`. Only showing monster type in full — other types follow the same pattern:

```js
// Field definitions for DTS types, derived from PoracleNG DTS.md.
// Each field has: name, type, description, category, preferred, deprecated, rawWebhook, preferredAlternative

const commonFields = [
  { name: 'latitude', type: 'number', description: 'Alert location latitude', category: 'location', preferred: true },
  { name: 'longitude', type: 'number', description: 'Alert location longitude', category: 'location', preferred: true },
  { name: 'addr', type: 'string', description: 'Formatted address from reverse geocoding', category: 'location', preferred: true },
  { name: 'streetName', type: 'string', description: 'Street name', category: 'location', preferred: true },
  { name: 'city', type: 'string', description: 'City name', category: 'location', preferred: true },
  { name: 'country', type: 'string', description: 'Country name', category: 'location', preferred: true },
  { name: 'flag', type: 'string', description: 'Country flag emoji', category: 'location', preferred: true },
  { name: 'staticMap', type: 'string', description: 'Static map tile image URL', category: 'maps', preferred: true },
  { name: 'staticmap', type: 'string', description: 'Deprecated alias for staticMap', category: 'maps', deprecated: true, preferredAlternative: 'staticMap' },
  { name: 'imgUrl', type: 'string', description: 'Primary icon URL', category: 'maps', preferred: true },
  { name: 'googleMapUrl', type: 'string', description: 'Google Maps link', category: 'maps', preferred: true },
  { name: 'appleMapUrl', type: 'string', description: 'Apple Maps link', category: 'maps', preferred: true },
  { name: 'wazeMapUrl', type: 'string', description: 'Waze link', category: 'maps', preferred: true },
  { name: 'mapurl', type: 'string', description: 'Deprecated alias for googleMapUrl', category: 'maps', deprecated: true, preferredAlternative: 'googleMapUrl' },
  { name: 'applemap', type: 'string', description: 'Deprecated alias for appleMapUrl', category: 'maps', deprecated: true, preferredAlternative: 'appleMapUrl' },
  { name: 'tthd', type: 'int', description: 'Days remaining', category: 'time', preferred: true },
  { name: 'tthh', type: 'int', description: 'Hours remaining', category: 'time', preferred: true },
  { name: 'tthm', type: 'int', description: 'Minutes remaining', category: 'time', preferred: true },
  { name: 'tths', type: 'int', description: 'Seconds remaining', category: 'time', preferred: true },
  { name: 'now', type: 'string', description: 'Current date/time', category: 'time', preferred: true },
  { name: 'areas', type: 'string', description: 'Comma-separated matched areas', category: 'location', preferred: true },
  { name: 'distance', type: 'number', description: 'Distance from user', category: 'location', preferred: true },
  { name: 'bearing', type: 'int', description: 'Bearing degrees from user', category: 'location', preferred: true },
  { name: 'bearingEmoji', type: 'string', description: 'Directional arrow emoji', category: 'location', preferred: true },
];

const monsterFields = [
  // Identity
  { name: 'name', type: 'string', description: 'Translated pokemon name', category: 'identity', preferred: true },
  { name: 'fullName', type: 'string', description: 'Name + form combined', category: 'identity', preferred: true },
  { name: 'formName', type: 'string', description: 'Translated form name', category: 'identity', preferred: true },
  { name: 'pokemonId', type: 'int', description: 'Pokemon ID', category: 'identity', preferred: true },
  { name: 'pokemon_id', type: 'int', description: 'Pokemon ID (webhook)', category: 'identity', rawWebhook: true, preferredAlternative: 'pokemonId' },
  { name: 'formId', type: 'int', description: 'Form ID', category: 'identity', preferred: true },
  { name: 'nameEng', type: 'string', description: 'English pokemon name', category: 'identity' },
  { name: 'fullNameEng', type: 'string', description: 'English name + form', category: 'identity' },
  // Stats
  { name: 'iv', type: 'number', description: 'IV percentage (0-100)', category: 'stats', preferred: true },
  { name: 'atk', type: 'int', description: 'Attack IV (0-15)', category: 'stats', preferred: true },
  { name: 'def', type: 'int', description: 'Defense IV (0-15)', category: 'stats', preferred: true },
  { name: 'sta', type: 'int', description: 'Stamina IV (0-15)', category: 'stats', preferred: true },
  { name: 'cp', type: 'int', description: 'Combat Power', category: 'stats', preferred: true },
  { name: 'level', type: 'int', description: 'Pokemon level', category: 'stats', preferred: true },
  { name: 'ivColor', type: 'string', description: 'Hex color based on IV range', category: 'stats', preferred: true },
  { name: 'weight', type: 'string', description: 'Weight in kg', category: 'stats' },
  { name: 'height', type: 'string', description: 'Height in m', category: 'stats' },
  { name: 'individual_attack', type: 'int', description: 'Attack IV (webhook)', category: 'stats', deprecated: true, preferredAlternative: 'atk' },
  { name: 'individual_defense', type: 'int', description: 'Defense IV (webhook)', category: 'stats', deprecated: true, preferredAlternative: 'def' },
  { name: 'individual_stamina', type: 'int', description: 'Stamina IV (webhook)', category: 'stats', deprecated: true, preferredAlternative: 'sta' },
  // Moves
  { name: 'quickMoveName', type: 'string', description: 'Translated fast move name', category: 'moves', preferred: true },
  { name: 'chargeMoveName', type: 'string', description: 'Translated charged move name', category: 'moves', preferred: true },
  { name: 'quickMoveEmoji', type: 'string', description: 'Fast move type emoji', category: 'moves', preferred: true },
  { name: 'chargeMoveEmoji', type: 'string', description: 'Charged move type emoji', category: 'moves', preferred: true },
  { name: 'quickMoveId', type: 'int', description: 'Fast move ID', category: 'moves' },
  { name: 'chargeMoveId', type: 'int', description: 'Charged move ID', category: 'moves' },
  { name: 'move_1', type: 'int', description: 'Fast move ID (webhook)', category: 'moves', deprecated: true, preferredAlternative: 'quickMoveId' },
  { name: 'move_2', type: 'int', description: 'Charged move ID (webhook)', category: 'moves', deprecated: true, preferredAlternative: 'chargeMoveId' },
  // Time
  { name: 'time', type: 'string', description: 'Disappear time (formatted)', category: 'time', preferred: true },
  { name: 'disappearTime', type: 'string', description: 'Same as time', category: 'time', preferred: true },
  { name: 'confirmedTime', type: 'bool', description: 'Is disappear time verified', category: 'time' },
  { name: 'distime', type: 'string', description: 'Deprecated alias for disappearTime', category: 'time', deprecated: true, preferredAlternative: 'disappearTime' },
  // Weather
  { name: 'boostWeatherEmoji', type: 'string', description: 'Boost weather emoji', category: 'weather', preferred: true },
  { name: 'boostWeatherName', type: 'string', description: 'Translated boost weather', category: 'weather', preferred: true },
  { name: 'boosted', type: 'bool', description: 'Is weather boosted', category: 'weather' },
  { name: 'weatherChange', type: 'string', description: 'Weather forecast text', category: 'weather' },
  // PVP
  { name: 'pvpGreat', type: 'array', description: 'Great League PVP display list', category: 'pvp', preferred: true },
  { name: 'pvpUltra', type: 'array', description: 'Ultra League PVP display list', category: 'pvp', preferred: true },
  { name: 'pvpLittle', type: 'array', description: 'Little League PVP display list', category: 'pvp', preferred: true },
  // Other
  { name: 'generation', type: 'int', description: 'Generation number', category: 'other' },
  { name: 'genderData', type: 'object', description: '{name, emoji}', category: 'other' },
  { name: 'shinyPossible', type: 'bool', description: 'Can be shiny', category: 'other' },
  { name: 'color', type: 'string', description: 'Primary type color hex', category: 'other' },
  { name: 'encountered', type: 'bool', description: 'Has IV data', category: 'other' },
];

// Block scopes — fields available inside block helpers
const blockScopes = {
  pvpGreat: {
    description: 'PVP Great League entry',
    fields: [
      { name: 'rank', type: 'int', description: 'PVP rank' },
      { name: 'cp', type: 'int', description: 'CP at this rank' },
      { name: 'fullName', type: 'string', description: 'Pokemon name + form' },
      { name: 'level', type: 'number', description: 'Level at this rank' },
      { name: 'levelWithCap', type: 'string', description: 'Level with cap' },
      { name: 'percentage', type: 'number', description: 'Stat product %' },
      { name: 'cap', type: 'int', description: 'Level cap' },
    ],
  },
  pvpUltra: { description: 'PVP Ultra League entry', fields: 'pvpGreat' }, // same shape
  pvpLittle: { description: 'PVP Little League entry', fields: 'pvpGreat' },
  weaknessList: {
    description: 'Weakness category',
    fields: [
      { name: 'value', type: 'string', description: 'Weakness multiplier' },
      { name: 'types', type: 'array', description: 'Array of {typeId, name, typeEmoji}' },
    ],
  },
};

// TODO: Add raid, egg, quest, invasion, lure, nest, gym, fort-update, weatherchange, greeting
// fields following the same pattern from DTS.md. Keeping monster as the initial complete type.

const raidFields = [
  { name: 'name', type: 'string', description: 'Translated pokemon name', category: 'identity', preferred: true },
  { name: 'fullName', type: 'string', description: 'Name + form', category: 'identity', preferred: true },
  { name: 'pokemon_id', type: 'int', description: 'Boss pokemon ID', category: 'identity', rawWebhook: true },
  { name: 'level', type: 'int', description: 'Raid level', category: 'identity', preferred: true },
  { name: 'gymName', type: 'string', description: 'Gym name', category: 'gym', preferred: true },
  { name: 'gym_name', type: 'string', description: 'Gym name (webhook)', category: 'gym', rawWebhook: true, preferredAlternative: 'gymName' },
  { name: 'gymUrl', type: 'string', description: 'Gym image URL', category: 'gym' },
  { name: 'gymColor', type: 'string', description: 'Team color hex', category: 'gym' },
  { name: 'ex', type: 'bool', description: 'Is EX raid eligible', category: 'gym' },
  { name: 'time', type: 'string', description: 'End time (formatted)', category: 'time', preferred: true },
  { name: 'quickMoveName', type: 'string', description: 'Translated fast move', category: 'moves', preferred: true },
  { name: 'chargeMoveName', type: 'string', description: 'Translated charged move', category: 'moves', preferred: true },
  { name: 'cp', type: 'int', description: 'Boss CP', category: 'stats', preferred: true },
  { name: 'levelName', type: 'string', description: 'Raid level name', category: 'identity', preferred: true },
];

const eggFields = [
  { name: 'level', type: 'int', description: 'Egg level', category: 'identity', preferred: true },
  { name: 'levelName', type: 'string', description: 'Raid level name', category: 'identity', preferred: true },
  { name: 'gymName', type: 'string', description: 'Gym name', category: 'gym', preferred: true },
  { name: 'gymColor', type: 'string', description: 'Team color hex', category: 'gym' },
  { name: 'ex', type: 'bool', description: 'Is EX raid eligible', category: 'gym' },
  { name: 'time', type: 'string', description: 'Hatch time (formatted)', category: 'time', preferred: true },
];

const questFields = [
  { name: 'pokestopName', type: 'string', description: 'Pokestop name', category: 'location', preferred: true },
  { name: 'questString', type: 'string', description: 'Quest description', category: 'quest', preferred: true },
  { name: 'rewardString', type: 'string', description: 'Reward description', category: 'quest', preferred: true },
];

const invasionFields = [
  { name: 'pokestopName', type: 'string', description: 'Pokestop name', category: 'location', preferred: true },
  { name: 'gruntType', type: 'string', description: 'Grunt type', category: 'invasion', preferred: true },
  { name: 'gruntTypeEmoji', type: 'string', description: 'Grunt type emoji', category: 'invasion', preferred: true },
  { name: 'gruntTypeColor', type: 'string', description: 'Grunt type color hex', category: 'invasion' },
  { name: 'genderData', type: 'object', description: '{name, emoji}', category: 'invasion' },
  { name: 'gruntRewardsList', type: 'object', description: 'Reward pokemon lists', category: 'invasion' },
  { name: 'time', type: 'string', description: 'End time (formatted)', category: 'time', preferred: true },
];

const lureFields = [
  { name: 'pokestopName', type: 'string', description: 'Pokestop name', category: 'location', preferred: true },
  { name: 'lureTypeName', type: 'string', description: 'Lure type name', category: 'lure', preferred: true },
  { name: 'lureTypeColor', type: 'string', description: 'Lure type color', category: 'lure' },
  { name: 'time', type: 'string', description: 'End time (formatted)', category: 'time', preferred: true },
];

const nestFields = [
  { name: 'name', type: 'string', description: 'Pokemon name', category: 'identity', preferred: true },
  { name: 'nestName', type: 'string', description: 'Nest location name', category: 'location', preferred: true },
  { name: 'pokemonSpawnAvg', type: 'number', description: 'Average spawns/hour', category: 'nest', preferred: true },
  { name: 'resetDate', type: 'string', description: 'Nest first found date', category: 'nest' },
  { name: 'color', type: 'string', description: 'Pokemon type color', category: 'other' },
];

const gymFields = [
  { name: 'gymName', type: 'string', description: 'Gym name', category: 'gym', preferred: true },
  { name: 'teamName', type: 'string', description: 'New controlling team', category: 'gym', preferred: true },
  { name: 'previousControlName', type: 'string', description: 'Previous team', category: 'gym' },
  { name: 'slotsAvailable', type: 'int', description: 'Slots available', category: 'gym' },
  { name: 'color', type: 'string', description: 'Team color hex', category: 'other' },
];

export const fieldsByType = {
  monster: [...commonFields, ...monsterFields],
  monsterNoIv: [...commonFields, ...monsterFields.filter((f) => f.category !== 'stats' || f.name === 'color')],
  raid: [...commonFields, ...raidFields],
  egg: [...commonFields, ...eggFields],
  quest: [...commonFields, ...questFields],
  invasion: [...commonFields, ...invasionFields],
  lure: [...commonFields, ...lureFields],
  nest: [...commonFields, ...nestFields],
  gym: [...commonFields, ...gymFields],
};

export { blockScopes };

export function getFieldsForType(type) {
  return fieldsByType[type] || commonFields;
}

export function getBlockScope(fieldName) {
  const scope = blockScopes[fieldName];
  if (!scope) return null;
  if (typeof scope.fields === 'string') {
    // Reference to another scope (e.g. pvpUltra → pvpGreat)
    return { ...scope, fields: blockScopes[scope.fields].fields };
  }
  return scope;
}
```

- [ ] **Step 2: Create static test data**

Create `src/data/test-data.js` with enriched variable maps for standalone mode. These are sample data showing what the enrichment pipeline would produce:

```js
// Pre-enriched variable maps for standalone mode.
// In connected mode, these are replaced by real data from POST /api/dts/render.

export const testScenarios = {
  monster: {
    hundo: {
      name: 'Magikarp',
      fullName: 'Magikarp',
      nameEng: 'Magikarp',
      fullNameEng: 'Magikarp',
      formName: '',
      formId: 253,
      pokemonId: 129,
      pokemon_id: 129,
      iv: 100,
      atk: 15,
      def: 15,
      sta: 15,
      cp: 212,
      level: 27,
      weight: '7.81',
      height: '0.87',
      ivColor: '#00ff00',
      color: '#6890F0',
      quickMoveName: 'Splash',
      chargeMoveName: 'Struggle',
      quickMoveEmoji: '💧',
      chargeMoveEmoji: '⚪',
      quickMoveId: 231,
      chargeMoveId: 133,
      time: '14:33',
      disappearTime: '14:33',
      confirmedTime: true,
      tthh: 0,
      tthm: 10,
      tths: 0,
      boostWeatherEmoji: '',
      boostWeatherName: '',
      boosted: false,
      weatherChange: '',
      encountered: true,
      genderData: { name: 'Male', emoji: '♂' },
      generation: 1,
      generationRoman: 'I',
      shinyPossible: true,
      addr: '123 Example Street, Canterbury',
      googleMapUrl: 'https://maps.google.com/maps?q=51.28,1.08',
      appleMapUrl: 'https://maps.apple.com/place?coordinate=51.28,1.08',
      wazeMapUrl: 'https://www.waze.com/ul?ll=51.28,1.08&navigate=yes',
      staticMap: 'https://example.com/staticmap.png',
      imgUrl: 'https://raw.githubusercontent.com/nileplumb/PkmnHomeIcons/master/RDM_OS_128/pokemon/129.png',
      pvpGreat: [
        { rank: 1, cp: 1498, fullName: 'Gyarados', level: 17.5, percentage: 98.5, cap: 50 },
      ],
      pvpUltra: [],
      pvpLittle: [],
      areas: 'Canterbury',
      latitude: 51.28,
      longitude: 1.08,
    },
    boring: {
      name: 'Barboach',
      fullName: 'Barboach',
      nameEng: 'Barboach',
      fullNameEng: 'Barboach',
      formName: '',
      pokemonId: 339,
      pokemon_id: 339,
      iv: 57.78,
      atk: 5,
      def: 12,
      sta: 9,
      cp: 512,
      level: 25,
      ivColor: '#ffff00',
      color: '#E0C068',
      quickMoveName: 'Mud Shot',
      chargeMoveName: 'Aqua Tail',
      quickMoveEmoji: '🟤',
      chargeMoveEmoji: '💧',
      time: '14:45',
      disappearTime: '14:45',
      confirmedTime: true,
      tthm: 10,
      tths: 0,
      encountered: true,
      genderData: { name: 'Female', emoji: '♀' },
      addr: '456 Test Road, Dover',
      googleMapUrl: 'https://maps.google.com/maps?q=51.29,1.07',
      appleMapUrl: 'https://maps.apple.com/place?coordinate=51.29,1.07',
      staticMap: 'https://example.com/staticmap.png',
      imgUrl: 'https://raw.githubusercontent.com/nileplumb/PkmnHomeIcons/master/RDM_OS_128/pokemon/339.png',
      pvpGreat: [],
      pvpUltra: [],
      pvpLittle: [],
      areas: 'Dover',
      latitude: 51.29,
      longitude: 1.07,
    },
  },
  raid: {
    level5: {
      name: 'Heatran',
      fullName: 'Heatran',
      pokemon_id: 485,
      level: 5,
      levelName: 'Legendary',
      cp: 49192,
      gymName: "St Martin's Church",
      gymColor: '#FFFF00',
      gymUrl: 'https://example.com/gym.png',
      ex: false,
      quickMoveName: 'Fire Spin',
      chargeMoveName: 'Iron Head',
      time: '15:04',
      tthm: 45,
      tths: 0,
      addr: '789 Church Lane, Canterbury',
      googleMapUrl: 'https://maps.google.com/maps?q=51.278,1.094',
      appleMapUrl: 'https://maps.apple.com/place?coordinate=51.278,1.094',
      staticMap: 'https://example.com/staticmap.png',
      imgUrl: 'https://raw.githubusercontent.com/nileplumb/PkmnHomeIcons/master/RDM_OS_128/pokemon/485.png',
      latitude: 51.278,
      longitude: 1.094,
    },
    egg1: {
      level: 1,
      levelName: 'Normal',
      gymName: 'The Labyrinth at The Quiet View',
      gymColor: '#0000FF',
      ex: false,
      time: '15:34',
      tthm: 45,
      tths: 0,
      addr: 'Canterbury',
      googleMapUrl: 'https://maps.google.com/maps?q=51.214,1.137',
      appleMapUrl: 'https://maps.apple.com/place?coordinate=51.214,1.137',
      staticMap: 'https://example.com/staticmap.png',
      imgUrl: 'https://raw.githubusercontent.com/nileplumb/PkmnHomeIcons/master/RDM_OS_128/raid/egg/1.png',
      latitude: 51.214,
      longitude: 1.137,
    },
  },
  quest: {
    basic: {
      pokestopName: 'Memorial Fountain',
      questString: 'Catch 5 Pokemon',
      rewardString: '500 Stardust',
      addr: '321 High Street',
      googleMapUrl: 'https://maps.google.com/maps?q=51.28,1.08',
      appleMapUrl: 'https://maps.apple.com/place?coordinate=51.28,1.08',
      staticMap: 'https://example.com/staticmap.png',
      imgUrl: 'https://example.com/quest.png',
      latitude: 51.28,
      longitude: 1.08,
    },
  },
  invasion: {
    basic: {
      pokestopName: 'Town Clock Tower',
      gruntType: 'Bug',
      gruntTypeEmoji: '🐛',
      gruntTypeColor: '#A8B820',
      genderData: { name: 'Female', emoji: '♀' },
      gruntRewardsList: {
        first: { chance: 100, monsters: [{ name: 'Weedle' }, { name: 'Caterpie' }] },
      },
      time: '15:30',
      tthh: 0,
      tthm: 25,
      tths: 0,
      addr: '555 Bug Alley',
      googleMapUrl: 'https://maps.google.com/maps?q=51.28,1.08',
      appleMapUrl: 'https://maps.apple.com/place?coordinate=51.28,1.08',
      staticMap: 'https://example.com/staticmap.png',
      imgUrl: 'https://example.com/grunt.png',
      latitude: 51.28,
      longitude: 1.08,
    },
  },
};

export function getTestScenario(type, scenario) {
  return testScenarios[type]?.[scenario] || null;
}

export function getTestScenarioNames(type) {
  return Object.keys(testScenarios[type] || {});
}
```

- [ ] **Step 3: Create default DTS templates**

Create `src/data/default-dts.js`. Copy the essential Discord templates from `~/dev/PoracleJs/config/defaults/dts.json`:

```js
// Default DTS templates — Discord platform only (Telegram deferred).
// These match the PoracleNG fallback dts.json defaults.

export const defaultTemplates = [
  {
    id: '1',
    language: 'en',
    type: 'monster',
    default: true,
    platform: 'discord',
    template: {
      embed: {
        color: '{{ivColor}}',
        title: '{{round iv}}% {{fullName}} cp:{{cp}} L:{{level}} {{atk}}/{{def}}/{{sta}} {{{boostWeatherEmoji}}}',
        description: 'End: {{time}}, Time left: {{tthm}}m {{tths}}s \n {{#if weatherChange}}{{{weatherChange}}}\n{{/if}}{{#if futureEvent}}There is an event ({{futureEventName}}) {{#eq futureEventTrigger "start"}}starting{{else}}ending{{/eq}} at {{futureEventTime}}.\n{{/if}}{{{addr}}} \n quick: {{quickMoveName}}, charge: {{chargeMoveName}} \n{{#if pvpLittle}}**Little league:**\n{{#each pvpLittle}} - {{fullName}} #{{rank}} @{{cp}}CP (Lvl. {{levelWithCap}})\n{{/each}}{{/if}}{{#if pvpGreat}}**Great league:**\n{{#each pvpGreat}} - {{fullName}} #{{rank}} @{{cp}}CP (Lvl. {{levelWithCap}})\n{{/each}}{{/if}}{{#if pvpUltra}}**Ultra league:**\n{{#each pvpUltra}} - {{fullName}} #{{rank}} @{{cp}}CP (Lvl. {{levelWithCap}})\n{{/each}}{{/if}} Maps: [Google]({{{googleMapUrl}}}) | [Apple]({{{appleMapUrl}}})',
        thumbnail: { url: '{{{imgUrl}}}' },
        image: { url: '{{{staticMap}}}' },
      },
    },
  },
  {
    id: '1',
    language: 'en',
    type: 'raid',
    default: true,
    platform: 'discord',
    template: {
      embed: {
        title: 'Raid against {{fullName}} has started at {{{gymName}}}! {{#ex}}(Ex){{/ex}}',
        description: 'CP: {{cp}}, quick: {{quickMoveName}}, charge: {{chargeMoveName}} \n Maps: [Google]({{{googleMapUrl}}}) | [Apple]({{{appleMapUrl}}})',
        color: '{{gymColor}}',
        thumbnail: { url: '{{{imgUrl}}}' },
        author: {
          name: '{{fullName}} {{levelName}} raid. End: {{time}} in {{tthm}}m {{tths}}s',
          icon_url: '{{{imgUrl}}}',
        },
        image: { url: '{{{staticMap}}}' },
      },
    },
  },
  {
    id: '1',
    language: 'en',
    type: 'egg',
    default: true,
    platform: 'discord',
    template: {
      embed: {
        title: '{{levelName}} raid Egg at {{{gymName}}} {{#ex}}(Ex){{/ex}}',
        description: 'Maps: [Google]({{{googleMapUrl}}}) | [Apple]({{{appleMapUrl}}})',
        color: '{{gymColor}}',
        thumbnail: { url: '{{{imgUrl}}}' },
        author: { name: 'Hatch at: {{time}} in {{tthm}}m {{tths}}s', icon_url: '{{{imgUrl}}}' },
        image: { url: '{{{staticMap}}}' },
      },
    },
  },
  {
    id: '1',
    language: 'en',
    type: 'quest',
    default: true,
    platform: 'discord',
    template: {
      embed: {
        title: 'Pokestop Name: {{{pokestopName}}}',
        url: '{{{googleMapUrl}}}',
        description: 'Quest: {{{questString}}}\nReward: {{{rewardString}}}\n{{{addr}}}\nMaps: [Google]({{{googleMapUrl}}}) | [Apple]({{{appleMapUrl}}})',
        thumbnail: { url: '{{{imgUrl}}}' },
        image: { url: '{{{staticMap}}}' },
      },
    },
  },
  {
    id: '1',
    language: 'en',
    type: 'invasion',
    default: true,
    platform: 'discord',
    template: {
      embed: {
        title: 'Team Rocket at {{{pokestopName}}}',
        url: '{{{googleMapUrl}}}',
        color: '{{gruntTypeColor}}',
        description: 'Type: {{gruntType}} {{gruntTypeEmoji}}\nGender: {{genderData.name}}{{genderData.emoji}}\nEnds: {{time}}, in ({{#if tthh}}{{tthh}}h {{/if}}{{tthm}}m {{tths}}s)\nAddress: {{{addr}}}\n[Google]({{{googleMapUrl}}}) | [Apple]({{{appleMapUrl}}})',
        thumbnail: { url: '{{{imgUrl}}}' },
        image: { url: '{{{staticMap}}}' },
      },
    },
  },
];

export function getDefaultTemplate(type, platform = 'discord', language = 'en', id = '1') {
  return defaultTemplates.find(
    (t) => t.type === type && t.platform === platform && t.language === language && String(t.id) === String(id)
  );
}

export function getAvailableTypes() {
  return [...new Set(defaultTemplates.map((t) => t.type))];
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add field definitions, static test data, and default DTS templates"
```

---

## Task 8: Main App Shell + Three-Panel Layout

**Files:**
- Modify: `src/App.jsx`
- Create: `src/components/TopBar.jsx`, `src/components/DiscordPreview.jsx`, `src/components/StatusBar.jsx`
- Create: `src/hooks/useHandlebars.js`, `src/hooks/useDts.js`

- [ ] **Step 1: Create the useHandlebars hook**

Create `src/hooks/useHandlebars.js`:

```jsx
import { useState, useMemo, useCallback } from 'react';
import { createEngine, renderDtsTemplate } from '../lib/handlebars-engine';

export function useHandlebars() {
  const engine = useMemo(() => createEngine(), []);
  const [renderError, setRenderError] = useState(null);

  const render = useCallback(
    (templateObj, data) => {
      try {
        const result = renderDtsTemplate(engine, templateObj, data);
        setRenderError(null);
        return result;
      } catch (err) {
        setRenderError(err.message);
        return null;
      }
    },
    [engine]
  );

  return { render, renderError };
}
```

- [ ] **Step 2: Create the useDts hook**

Create `src/hooks/useDts.js`:

```jsx
import { useState, useCallback } from 'react';
import { defaultTemplates, getDefaultTemplate } from '../data/default-dts';
import { testScenarios, getTestScenario, getTestScenarioNames } from '../data/test-data';

export function useDts() {
  const [templates, setTemplates] = useState(defaultTemplates);
  const [filters, setFilters] = useState({
    type: 'monster',
    platform: 'discord',
    language: 'en',
    id: '1',
  });
  const [testScenario, setTestScenario] = useState('hundo');

  const currentTemplate = templates.find(
    (t) =>
      t.type === filters.type &&
      t.platform === filters.platform &&
      t.language === filters.language &&
      String(t.id) === String(filters.id)
  ) || getDefaultTemplate(filters.type);

  const currentTestData = getTestScenario(filters.type, testScenario) || {};

  const availableTypes = [...new Set(templates.map((t) => t.type))];
  const availableIds = [
    ...new Set(
      templates
        .filter((t) => t.type === filters.type && t.platform === filters.platform)
        .map((t) => String(t.id))
    ),
  ];
  const availableScenarios = getTestScenarioNames(filters.type);

  const updateTemplate = useCallback(
    (newTemplateObj) => {
      setTemplates((prev) =>
        prev.map((t) =>
          t.type === filters.type &&
          t.platform === filters.platform &&
          t.language === filters.language &&
          String(t.id) === String(filters.id)
            ? { ...t, template: newTemplateObj }
            : t
        )
      );
    },
    [filters]
  );

  const loadTemplates = useCallback((entries) => {
    setTemplates(entries);
    if (entries.length > 0) {
      const first = entries[0];
      setFilters({
        type: first.type,
        platform: first.platform || 'discord',
        language: first.language || 'en',
        id: String(first.id),
      });
    }
  }, []);

  const updateTestData = useCallback((data) => {
    // For custom test data, we store it separately
    // This is handled by the TestDataPanel component
  }, []);

  return {
    templates,
    filters,
    setFilters,
    currentTemplate,
    currentTestData,
    testScenario,
    setTestScenario,
    availableTypes,
    availableIds,
    availableScenarios,
    updateTemplate,
    loadTemplates,
  };
}
```

- [ ] **Step 3: Create TopBar component**

Create `src/components/TopBar.jsx`:

```jsx
export default function TopBar({
  filters,
  setFilters,
  availableTypes,
  availableIds,
  onLoadFile,
  onSave,
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-700 text-sm">
      <div className="flex items-center gap-3">
        <span className="font-bold text-blue-400">Poracle DTS Editor</span>
        <span className="text-gray-600">|</span>

        <label className="text-gray-400">Type:</label>
        <select
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          className="bg-gray-800 text-yellow-300 px-2 py-0.5 rounded text-sm border border-gray-600"
        >
          {availableTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <label className="text-gray-400">Template:</label>
        <select
          value={filters.id}
          onChange={(e) => setFilters({ ...filters, id: e.target.value })}
          className="bg-gray-800 text-yellow-300 px-2 py-0.5 rounded text-sm border border-gray-600"
        >
          {availableIds.map((id) => (
            <option key={id} value={id}>{id}</option>
          ))}
        </select>

        <label className="text-gray-400">Platform:</label>
        <select
          value={filters.platform}
          onChange={(e) => setFilters({ ...filters, platform: e.target.value })}
          className="bg-gray-800 text-yellow-300 px-2 py-0.5 rounded text-sm border border-gray-600"
        >
          <option value="discord">discord</option>
        </select>

        <label className="text-gray-400">Lang:</label>
        <select
          value={filters.language}
          onChange={(e) => setFilters({ ...filters, language: e.target.value })}
          className="bg-gray-800 text-yellow-300 px-2 py-0.5 rounded text-sm border border-gray-600"
        >
          <option value="en">en</option>
        </select>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onLoadFile}
          className="bg-gray-800 text-teal-300 px-3 py-0.5 rounded text-sm border border-gray-600 hover:bg-gray-700"
        >
          Load File
        </button>
        <button
          onClick={onSave}
          className="bg-gray-800 text-teal-300 px-3 py-0.5 rounded text-sm border border-gray-600 hover:bg-gray-700"
        >
          Save
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create DiscordPreview wrapper**

Create `src/components/DiscordPreview.jsx`:

```jsx
import { useState } from 'react';
import DiscordView from './discordview';

export default function DiscordPreview({ data, error }) {
  const [darkTheme, setDarkTheme] = useState(true);
  const [compactMode, setCompactMode] = useState(false);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-700 text-sm">
        <span className="text-blue-400">Discord Preview</span>
        <div className="flex gap-2 text-xs">
          <button
            onClick={() => setDarkTheme(!darkTheme)}
            className="text-gray-400 hover:text-white"
          >
            {darkTheme ? 'Light' : 'Dark'}
          </button>
          <button
            onClick={() => setCompactMode(!compactMode)}
            className="text-gray-400 hover:text-white"
          >
            {compactMode ? 'Cozy' : 'Compact'}
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <DiscordView
          data={data || {}}
          error={error}
          darkTheme={darkTheme}
          compactMode={compactMode}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create StatusBar**

Create `src/components/StatusBar.jsx`:

```jsx
export default function StatusBar({ connected, url, testScenario, error }) {
  return (
    <div className="flex items-center justify-between px-3 py-1 bg-gray-900 border-t border-gray-700 text-xs">
      <div className="flex items-center gap-3">
        {connected ? (
          <>
            <span className="text-green-400">● Connected to PoracleNG</span>
            <span className="text-gray-500">{url}</span>
          </>
        ) : (
          <span className="text-gray-500">● Standalone mode</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        {error && <span className="text-red-400">{error}</span>}
        {testScenario && (
          <span className="text-yellow-300">Test: {testScenario}</span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Wire up the App shell**

Update `src/App.jsx`:

```jsx
import { useMemo } from 'react';
import TopBar from './components/TopBar';
import DiscordPreview from './components/DiscordPreview';
import StatusBar from './components/StatusBar';
import { useDts } from './hooks/useDts';
import { useHandlebars } from './hooks/useHandlebars';

export default function App() {
  const dts = useDts();
  const { render, renderError } = useHandlebars();

  const renderedData = useMemo(() => {
    if (!dts.currentTemplate?.template) return {};
    return render(dts.currentTemplate.template, dts.currentTestData) || {};
  }, [dts.currentTemplate, dts.currentTestData, render]);

  const handleLoadFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target.result);
          const entries = Array.isArray(parsed) ? parsed : [parsed];
          dts.loadTemplates(entries);
        } catch (err) {
          alert('Invalid JSON file: ' + err.message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleSave = () => {
    const blob = new Blob([JSON.stringify(dts.templates, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dts.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-200">
      <TopBar
        filters={dts.filters}
        setFilters={dts.setFilters}
        availableTypes={dts.availableTypes}
        availableIds={dts.availableIds}
        onLoadFile={handleLoadFile}
        onSave={handleSave}
      />

      <div className="flex flex-1 min-h-0">
        {/* Left panel — Template Editor (placeholder) */}
        <div className="w-1/3 border-r border-gray-700 overflow-y-auto p-3">
          <div className="text-gray-500 text-sm">Template Editor — coming in Task 9</div>
          <pre className="text-xs text-gray-400 mt-2 whitespace-pre-wrap">
            {JSON.stringify(dts.currentTemplate?.template, null, 2)}
          </pre>
        </div>

        {/* Middle panel — Tag Picker (placeholder) */}
        <div className="w-60 border-r border-gray-700 overflow-y-auto p-3">
          <div className="text-gray-500 text-sm">Tag Picker — coming in Task 10</div>
        </div>

        {/* Right panel — Discord Preview */}
        <div className="flex-1">
          <DiscordPreview data={renderedData} error={renderError} />
        </div>
      </div>

      <StatusBar
        connected={false}
        testScenario={dts.testScenario}
        error={renderError}
      />
    </div>
  );
}
```

- [ ] **Step 7: Verify the app renders with live preview**

Run: `npm run dev`
Expected: Three-panel layout. Left shows raw template JSON. Right shows the Discord embed preview with rendered Magikarp data (from test data + Handlebars compilation). Top bar has filter dropdowns. Bottom bar shows "Standalone mode".

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add three-panel app shell with live Handlebars rendering and Discord preview"
```

---

## Task 9: Form-Based Template Editor

**Files:**
- Create: `src/components/TemplateEditor.jsx`, `src/components/FormEditor.jsx`, `src/components/RawEditor.jsx`
- Install: `codemirror`, `@codemirror/lang-json`, `@codemirror/theme-one-dark`

- [ ] **Step 1: Install CodeMirror 6**

```bash
npm install codemirror @codemirror/lang-json @codemirror/theme-one-dark @codemirror/view @codemirror/state
```

- [ ] **Step 2: Create RawEditor (CodeMirror 6 wrapper)**

Create `src/components/RawEditor.jsx`:

```jsx
import { useEffect, useRef, useCallback } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { json } from '@codemirror/lang-json';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorState } from '@codemirror/state';

export default function RawEditor({ value, onChange }) {
  const containerRef = useRef(null);
  const viewRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const externalUpdate = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && !externalUpdate.current) {
        onChangeRef.current(update.state.doc.toString());
      }
    });

    const state = EditorState.create({
      doc: value,
      extensions: [basicSetup, json(), oneDark, updateListener],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => view.destroy();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      externalUpdate.current = true;
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
      externalUpdate.current = false;
    }
  }, [value]);

  return <div ref={containerRef} className="h-full overflow-auto" />;
}
```

- [ ] **Step 3: Create FormEditor**

Create `src/components/FormEditor.jsx`:

```jsx
import { useCallback } from 'react';

function EmbedField({ label, value, onChange, multiline = false }) {
  const Tag = multiline ? 'textarea' : 'input';
  return (
    <div className="mb-3">
      <label className="block text-xs text-gray-400 uppercase mb-1">{label}</label>
      <Tag
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-gray-800 text-gray-200 px-2 py-1.5 rounded border border-gray-600 text-sm font-mono focus:border-blue-400 focus:outline-none"
        rows={multiline ? 4 : undefined}
      />
    </div>
  );
}

function EmbedFieldItem({ field, index, onChange, onRemove }) {
  return (
    <div className="border border-gray-700 rounded p-2 mb-2">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-gray-500">Field {index + 1}</span>
        <button onClick={onRemove} className="text-xs text-red-400 hover:text-red-300">Remove</button>
      </div>
      <input
        value={field.name || ''}
        onChange={(e) => onChange({ ...field, name: e.target.value })}
        placeholder="Name"
        className="w-full bg-gray-800 text-gray-200 px-2 py-1 rounded border border-gray-600 text-sm font-mono mb-1"
      />
      <textarea
        value={field.value || ''}
        onChange={(e) => onChange({ ...field, value: e.target.value })}
        placeholder="Value"
        rows={2}
        className="w-full bg-gray-800 text-gray-200 px-2 py-1 rounded border border-gray-600 text-sm font-mono mb-1"
      />
      <label className="flex items-center gap-1 text-xs text-gray-400">
        <input
          type="checkbox"
          checked={field.inline || false}
          onChange={(e) => onChange({ ...field, inline: e.target.checked })}
        />
        Inline
      </label>
    </div>
  );
}

export default function FormEditor({ template, onChange }) {
  const embed = template?.embed || {};

  const updateEmbed = useCallback(
    (key, value) => {
      onChange({ ...template, embed: { ...embed, [key]: value } });
    },
    [template, embed, onChange]
  );

  const updateNested = useCallback(
    (parent, key, value) => {
      const existing = embed[parent] || {};
      onChange({
        ...template,
        embed: { ...embed, [parent]: { ...existing, [key]: value } },
      });
    },
    [template, embed, onChange]
  );

  const updateField = useCallback(
    (index, field) => {
      const fields = [...(embed.fields || [])];
      fields[index] = field;
      updateEmbed('fields', fields);
    },
    [embed, updateEmbed]
  );

  const removeField = useCallback(
    (index) => {
      const fields = [...(embed.fields || [])];
      fields.splice(index, 1);
      updateEmbed('fields', fields.length > 0 ? fields : undefined);
    },
    [embed, updateEmbed]
  );

  const addField = useCallback(() => {
    const fields = [...(embed.fields || []), { name: '', value: '' }];
    updateEmbed('fields', fields);
  }, [embed, updateEmbed]);

  return (
    <div className="p-3 space-y-1">
      <EmbedField label="Color" value={embed.color} onChange={(v) => updateEmbed('color', v)} />
      <EmbedField label="Title" value={embed.title} onChange={(v) => updateEmbed('title', v)} />
      <EmbedField label="URL" value={embed.url} onChange={(v) => updateEmbed('url', v || undefined)} />
      <EmbedField
        label="Description"
        value={embed.description}
        onChange={(v) => updateEmbed('description', v)}
        multiline
      />
      <EmbedField
        label="Thumbnail URL"
        value={embed.thumbnail?.url}
        onChange={(v) => updateNested('thumbnail', 'url', v)}
      />
      <EmbedField
        label="Image URL"
        value={embed.image?.url}
        onChange={(v) => updateNested('image', 'url', v)}
      />

      {/* Author */}
      <div className="mb-3">
        <label className="block text-xs text-gray-400 uppercase mb-1">Author</label>
        <input
          value={embed.author?.name || ''}
          onChange={(e) => updateNested('author', 'name', e.target.value)}
          placeholder="Author name"
          className="w-full bg-gray-800 text-gray-200 px-2 py-1 rounded border border-gray-600 text-sm font-mono mb-1"
        />
        <input
          value={embed.author?.icon_url || ''}
          onChange={(e) => updateNested('author', 'icon_url', e.target.value)}
          placeholder="Author icon URL"
          className="w-full bg-gray-800 text-gray-200 px-2 py-1 rounded border border-gray-600 text-sm font-mono"
        />
      </div>

      {/* Footer */}
      <div className="mb-3">
        <label className="block text-xs text-gray-400 uppercase mb-1">Footer</label>
        <input
          value={embed.footer?.text || ''}
          onChange={(e) => updateNested('footer', 'text', e.target.value)}
          placeholder="Footer text"
          className="w-full bg-gray-800 text-gray-200 px-2 py-1 rounded border border-gray-600 text-sm font-mono mb-1"
        />
        <input
          value={embed.footer?.icon_url || ''}
          onChange={(e) => updateNested('footer', 'icon_url', e.target.value)}
          placeholder="Footer icon URL"
          className="w-full bg-gray-800 text-gray-200 px-2 py-1 rounded border border-gray-600 text-sm font-mono"
        />
      </div>

      <EmbedField
        label="Timestamp"
        value={embed.timestamp}
        onChange={(v) => updateEmbed('timestamp', v || undefined)}
      />

      {/* Fields array */}
      <div className="mb-3">
        <label className="block text-xs text-gray-400 uppercase mb-1">Fields</label>
        {(embed.fields || []).map((f, i) => (
          <EmbedFieldItem
            key={i}
            field={f}
            index={i}
            onChange={(field) => updateField(i, field)}
            onRemove={() => removeField(i)}
          />
        ))}
        <button
          onClick={addField}
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          + Add Field
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create TemplateEditor (form/raw toggle)**

Create `src/components/TemplateEditor.jsx`:

```jsx
import { useState, useCallback } from 'react';
import FormEditor from './FormEditor';
import RawEditor from './RawEditor';

export default function TemplateEditor({ template, onChange }) {
  const [mode, setMode] = useState('form'); // 'form' | 'raw'

  const handleRawChange = useCallback(
    (text) => {
      try {
        const parsed = JSON.parse(text);
        onChange(parsed);
      } catch {
        // Ignore parse errors while typing — user is mid-edit
      }
    },
    [onChange]
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 px-3 py-1.5 border-b border-gray-700 text-sm">
        <button
          onClick={() => setMode('form')}
          className={mode === 'form' ? 'text-blue-400 border-b-2 border-blue-400 pb-1' : 'text-gray-500 pb-1'}
        >
          Form
        </button>
        <button
          onClick={() => setMode('raw')}
          className={mode === 'raw' ? 'text-blue-400 border-b-2 border-blue-400 pb-1' : 'text-gray-500 pb-1'}
        >
          Raw JSON
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {mode === 'form' ? (
          <FormEditor template={template} onChange={onChange} />
        ) : (
          <RawEditor
            value={JSON.stringify(template, null, 2)}
            onChange={handleRawChange}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Wire into App.jsx**

Update `src/App.jsx` — replace the left panel placeholder:

```jsx
import TemplateEditor from './components/TemplateEditor';
```

Replace the left panel div:

```jsx
{/* Left panel — Template Editor */}
<div className="w-1/3 border-r border-gray-700">
  <TemplateEditor
    template={dts.currentTemplate?.template}
    onChange={dts.updateTemplate}
  />
</div>
```

- [ ] **Step 6: Verify form editor works with live preview**

Run: `npm run dev`
Expected: Form fields (Title, Description, etc.) populated with Handlebars expressions from the monster template. Editing a field updates the Discord preview in real time. Switching to "Raw JSON" tab shows the full template JSON in CodeMirror. Changes in raw mode reflect in form mode and vice versa.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add form-based and raw JSON template editor with bidirectional sync"
```

---

## Task 10: Tag Picker + Test Data Panel

**Files:**
- Create: `src/components/TagPicker.jsx`, `src/components/TestDataPanel.jsx`

- [ ] **Step 1: Create TagPicker**

Create `src/components/TagPicker.jsx`:

```jsx
import { useState, useMemo } from 'react';
import { getFieldsForType, getBlockScope } from '../lib/field-definitions';

function FieldTag({ field, onClick }) {
  const colorByCategory = {
    identity: 'text-yellow-300',
    stats: 'text-green-300',
    moves: 'text-cyan-300',
    time: 'text-orange-300',
    location: 'text-pink-300',
    maps: 'text-pink-300',
    weather: 'text-blue-300',
    pvp: 'text-purple-300',
    other: 'text-gray-300',
  };

  const color = field.deprecated
    ? 'text-gray-600 line-through'
    : field.rawWebhook
      ? 'text-gray-400'
      : colorByCategory[field.category] || 'text-gray-300';

  const isUrl = field.type === 'string' && (
    field.name.toLowerCase().includes('url') ||
    field.name.toLowerCase().includes('map') ||
    field.name === 'staticMap' ||
    field.name === 'imgUrl'
  );

  return (
    <button
      onClick={() => onClick(field.name, isUrl)}
      className={`bg-gray-800 px-1.5 py-0.5 rounded text-xs font-mono cursor-pointer hover:bg-gray-700 ${color}`}
      title={`${field.description}${field.preferredAlternative ? ` → use ${field.preferredAlternative}` : ''}`}
    >
      {field.name}
    </button>
  );
}

export default function TagPicker({ type, onInsertTag }) {
  const [showDeprecated, setShowDeprecated] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const allFields = useMemo(() => getFieldsForType(type), [type]);

  const filteredFields = useMemo(() => {
    return allFields.filter((f) => {
      if (f.deprecated && !showDeprecated) return false;
      if (f.rawWebhook && !showRaw) return false;
      return true;
    });
  }, [allFields, showDeprecated, showRaw]);

  const grouped = useMemo(() => {
    const groups = {};
    for (const field of filteredFields) {
      const cat = field.category || 'other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(field);
    }
    // Sort: preferred first within each category
    for (const cat of Object.keys(groups)) {
      groups[cat].sort((a, b) => {
        if (a.preferred && !b.preferred) return -1;
        if (!a.preferred && b.preferred) return 1;
        return 0;
      });
    }
    return groups;
  }, [filteredFields]);

  const handleClick = (name, isUrl) => {
    const tag = isUrl ? `{{{${name}}}}` : `{{${name}}}`;
    onInsertTag(tag);
  };

  const helpers = [
    { label: '{{#if ...}}...{{/if}}', insert: '{{#if }}  {{/if}}' },
    { label: '{{#each ...}}...{{/each}}', insert: '{{#each }}  {{/each}}' },
    { label: '{{#unless ...}}', insert: '{{#unless }}  {{/unless}}' },
    { label: '{{round ...}}', insert: '{{round }}' },
    { label: '{{numberFormat ... N}}', insert: '{{numberFormat  2}}' },
    { label: '{{#eq a b}}', insert: '{{#eq  ""}}  {{else}}  {{/eq}}' },
    { label: '{{#compare a op b}}', insert: '{{#compare  "==" }}  {{/compare}}' },
    { label: '{{#forEach ...}}', insert: '{{#forEach }}{{this}}{{#unless isLast}}, {{/unless}}{{/forEach}}' },
  ];

  return (
    <div className="p-2 text-xs">
      {Object.entries(grouped).map(([category, fields]) => (
        <div key={category} className="mb-3">
          <div className="text-gray-400 uppercase text-[10px] mb-1.5">{category}</div>
          <div className="flex flex-wrap gap-1">
            {fields.map((f) => (
              <FieldTag key={f.name} field={f} onClick={handleClick} />
            ))}
          </div>
        </div>
      ))}

      <div className="mb-3">
        <div className="text-gray-400 uppercase text-[10px] mb-1.5">Helpers</div>
        <div className="flex flex-wrap gap-1">
          {helpers.map((h) => (
            <button
              key={h.label}
              onClick={() => onInsertTag(h.insert)}
              className="bg-gray-700 text-purple-300 px-1.5 py-0.5 rounded text-xs font-mono cursor-pointer hover:bg-gray-600"
            >
              {h.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 mt-2 border-t border-gray-700 pt-2">
        <label className="flex items-center gap-1 text-gray-500 cursor-pointer">
          <input
            type="checkbox"
            checked={showRaw}
            onChange={(e) => setShowRaw(e.target.checked)}
          />
          Raw webhook
        </label>
        <label className="flex items-center gap-1 text-gray-500 cursor-pointer">
          <input
            type="checkbox"
            checked={showDeprecated}
            onChange={(e) => setShowDeprecated(e.target.checked)}
          />
          Deprecated
        </label>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create TestDataPanel**

Create `src/components/TestDataPanel.jsx`:

```jsx
import { useState, useEffect } from 'react';
import RawEditor from './RawEditor';

export default function TestDataPanel({
  testData,
  onTestDataChange,
  scenarios,
  currentScenario,
  onScenarioChange,
}) {
  const [editedJson, setEditedJson] = useState(JSON.stringify(testData, null, 2));

  useEffect(() => {
    setEditedJson(JSON.stringify(testData, null, 2));
  }, [testData]);

  const handleJsonChange = (text) => {
    setEditedJson(text);
    try {
      const parsed = JSON.parse(text);
      onTestDataChange(parsed);
    } catch {
      // Ignore while typing
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-2 py-1.5 border-b border-gray-700">
        <select
          value={currentScenario}
          onChange={(e) => onScenarioChange(e.target.value)}
          className="w-full bg-gray-800 text-yellow-300 px-2 py-0.5 rounded text-xs border border-gray-600"
        >
          {scenarios.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="flex-1 overflow-hidden">
        <RawEditor value={editedJson} onChange={handleJsonChange} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create middle panel with tabs and wire into App**

Update `src/App.jsx`. Replace the middle panel placeholder with a tabbed panel:

Add state for the middle panel tab, custom test data, and tag insertion:

```jsx
import { useState, useMemo, useCallback } from 'react';
import TopBar from './components/TopBar';
import TemplateEditor from './components/TemplateEditor';
import TagPicker from './components/TagPicker';
import TestDataPanel from './components/TestDataPanel';
import DiscordPreview from './components/DiscordPreview';
import StatusBar from './components/StatusBar';
import { useDts } from './hooks/useDts';
import { useHandlebars } from './hooks/useHandlebars';

export default function App() {
  const dts = useDts();
  const { render, renderError } = useHandlebars();
  const [middleTab, setMiddleTab] = useState('tags');
  const [customTestData, setCustomTestData] = useState(null);

  const activeTestData = customTestData || dts.currentTestData;

  const renderedData = useMemo(() => {
    if (!dts.currentTemplate?.template) return {};
    return render(dts.currentTemplate.template, activeTestData) || {};
  }, [dts.currentTemplate, activeTestData, render]);

  const handleInsertTag = useCallback((tag) => {
    navigator.clipboard.writeText(tag);
    // TODO: In a future refinement, insert at cursor position in active editor field
  }, []);

  const handleScenarioChange = useCallback((scenario) => {
    dts.setTestScenario(scenario);
    setCustomTestData(null);
  }, [dts]);

  // ... handleLoadFile and handleSave same as before ...

  const handleLoadFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target.result);
          const entries = Array.isArray(parsed) ? parsed : [parsed];
          dts.loadTemplates(entries);
        } catch (err) {
          alert('Invalid JSON file: ' + err.message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleSave = () => {
    const blob = new Blob([JSON.stringify(dts.templates, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dts.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-200">
      <TopBar
        filters={dts.filters}
        setFilters={dts.setFilters}
        availableTypes={dts.availableTypes}
        availableIds={dts.availableIds}
        onLoadFile={handleLoadFile}
        onSave={handleSave}
      />

      <div className="flex flex-1 min-h-0">
        {/* Left panel — Template Editor */}
        <div className="w-1/3 border-r border-gray-700">
          <TemplateEditor
            template={dts.currentTemplate?.template}
            onChange={dts.updateTemplate}
          />
        </div>

        {/* Middle panel — Tag Picker / Test Data */}
        <div className="w-60 border-r border-gray-700 flex flex-col">
          <div className="flex gap-2 px-3 py-1.5 border-b border-gray-700 text-sm">
            <button
              onClick={() => setMiddleTab('tags')}
              className={middleTab === 'tags' ? 'text-blue-400 border-b-2 border-blue-400 pb-1' : 'text-gray-500 pb-1'}
            >
              Tags
            </button>
            <button
              onClick={() => setMiddleTab('data')}
              className={middleTab === 'data' ? 'text-blue-400 border-b-2 border-blue-400 pb-1' : 'text-gray-500 pb-1'}
            >
              Test Data
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {middleTab === 'tags' ? (
              <TagPicker type={dts.filters.type} onInsertTag={handleInsertTag} />
            ) : (
              <TestDataPanel
                testData={activeTestData}
                onTestDataChange={setCustomTestData}
                scenarios={dts.availableScenarios}
                currentScenario={dts.testScenario}
                onScenarioChange={handleScenarioChange}
              />
            )}
          </div>
        </div>

        {/* Right panel — Discord Preview */}
        <div className="flex-1">
          <DiscordPreview data={renderedData} error={renderError} />
        </div>
      </div>

      <StatusBar
        connected={false}
        testScenario={dts.testScenario}
        error={renderError}
      />
    </div>
  );
}
```

- [ ] **Step 4: Verify tag picker and test data panel work**

Run: `npm run dev`
Expected: Middle panel shows Tags tab with fields grouped by category (identity, stats, moves, etc.). Clicking a tag copies `{{fieldName}}` to clipboard. Switching to Test Data tab shows scenario picker and editable JSON. Changing the scenario updates the preview. Editing test data JSON updates the preview in real time. Toggling "Raw webhook" and "Deprecated" checkboxes shows/hides additional fields.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add tag picker with field categories and editable test data panel"
```

---

## Task 11: API Client (Optional PoracleNG Connection)

**Files:**
- Create: `src/lib/api-client.js`, `src/hooks/useApi.js`

- [ ] **Step 1: Create API client**

Create `src/lib/api-client.js`:

```js
export class PoracleApiClient {
  constructor(baseUrl, secret) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.secret = secret;
  }

  async fetch(path, options = {}) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Poracle-Secret': this.secret,
        ...options.headers,
      },
    });
    if (!res.ok) {
      throw new Error(`API error: ${res.status} ${res.statusText}`);
    }
    return res.json();
  }

  async getTemplates(filters = {}) {
    const params = new URLSearchParams();
    if (filters.type) params.set('type', filters.type);
    if (filters.platform) params.set('platform', filters.platform);
    if (filters.language) params.set('language', filters.language);
    const query = params.toString();
    return this.fetch(`/api/dts/templates${query ? '?' + query : ''}`);
  }

  async saveTemplates(entries) {
    return this.fetch('/api/dts/templates', {
      method: 'POST',
      body: JSON.stringify(entries),
    });
  }

  async renderTestData(type, webhook) {
    return this.fetch('/api/dts/render', {
      method: 'POST',
      body: JSON.stringify({ type, webhook }),
    });
  }

  async sendWebhook(type, webhook, template, language) {
    return this.fetch('/api/dts/webhook', {
      method: 'POST',
      body: JSON.stringify({ type, webhook, template, language }),
    });
  }

  async getFields(type) {
    return this.fetch(`/api/dts/fields/${type}`);
  }

  async health() {
    return this.fetch('/health');
  }
}
```

- [ ] **Step 2: Create useApi hook**

Create `src/hooks/useApi.js`:

```jsx
import { useState, useCallback, useRef } from 'react';
import { PoracleApiClient } from '../lib/api-client';

export function useApi() {
  const [connected, setConnected] = useState(false);
  const [url, setUrl] = useState('');
  const [error, setError] = useState(null);
  const clientRef = useRef(null);

  const connect = useCallback(async (baseUrl, secret) => {
    try {
      const client = new PoracleApiClient(baseUrl, secret);
      await client.health();
      clientRef.current = client;
      setUrl(baseUrl);
      setConnected(true);
      setError(null);
      return client;
    } catch (err) {
      setConnected(false);
      setError(err.message);
      clientRef.current = null;
      return null;
    }
  }, []);

  const disconnect = useCallback(() => {
    clientRef.current = null;
    setConnected(false);
    setUrl('');
    setError(null);
  }, []);

  return {
    connected,
    url,
    error,
    client: clientRef.current,
    connect,
    disconnect,
  };
}
```

- [ ] **Step 3: Wire API into StatusBar and App**

Update `src/components/StatusBar.jsx` to add a connect button:

```jsx
import { useState } from 'react';

export default function StatusBar({ connected, url, testScenario, error, onConnect, onDisconnect }) {
  const [showConnect, setShowConnect] = useState(false);
  const [apiUrl, setApiUrl] = useState('http://localhost:3030');
  const [apiSecret, setApiSecret] = useState('');

  return (
    <div className="flex items-center justify-between px-3 py-1 bg-gray-900 border-t border-gray-700 text-xs">
      <div className="flex items-center gap-3">
        {connected ? (
          <>
            <span className="text-green-400">● Connected to PoracleNG</span>
            <span className="text-gray-500">{url}</span>
            <button onClick={onDisconnect} className="text-gray-500 hover:text-red-400">Disconnect</button>
          </>
        ) : (
          <>
            <span className="text-gray-500">● Standalone mode</span>
            <button
              onClick={() => setShowConnect(!showConnect)}
              className="text-blue-400 hover:text-blue-300"
            >
              Connect
            </button>
          </>
        )}
        {showConnect && !connected && (
          <div className="flex items-center gap-2">
            <input
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="http://localhost:3030"
              className="bg-gray-800 text-gray-200 px-2 py-0.5 rounded border border-gray-600 text-xs w-48"
            />
            <input
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder="API secret"
              type="password"
              className="bg-gray-800 text-gray-200 px-2 py-0.5 rounded border border-gray-600 text-xs w-24"
            />
            <button
              onClick={() => { onConnect(apiUrl, apiSecret); setShowConnect(false); }}
              className="text-green-400 hover:text-green-300"
            >
              Go
            </button>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        {error && <span className="text-red-400">{error}</span>}
        {testScenario && (
          <span className="text-yellow-300">Test: {testScenario}</span>
        )}
      </div>
    </div>
  );
}
```

Update `src/App.jsx` — add useApi and wire connect/disconnect:

Add import and hook:
```jsx
import { useApi } from './hooks/useApi';
```

Inside App:
```jsx
const api = useApi();

const handleConnect = useCallback(async (url, secret) => {
  const client = await api.connect(url, secret);
  if (client) {
    try {
      const result = await client.getTemplates();
      if (result.templates) {
        dts.loadTemplates(result.templates);
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  }
}, [api, dts]);
```

Update StatusBar props:
```jsx
<StatusBar
  connected={api.connected}
  url={api.url}
  testScenario={dts.testScenario}
  error={renderError || api.error}
  onConnect={handleConnect}
  onDisconnect={api.disconnect}
/>
```

- [ ] **Step 4: Verify API connection works (if PoracleNG is running) or fails gracefully**

Run: `npm run dev`
Expected: "Standalone mode" shown in status bar. Clicking "Connect" shows URL/secret inputs. If no PoracleNG is running, connection fails with an error message. Everything continues working in standalone mode.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add optional PoracleNG API client with connect/disconnect in status bar"
```

---

## Task 12: Run All Tests + Final Cleanup

**Files:**
- Modify: `package.json` (ensure vitest config)
- Possibly modify: various files for cleanup

- [ ] **Step 1: Add vitest config to package.json**

Ensure `package.json` has:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  }
}
```

- [ ] **Step 2: Run all tests**

Run: `npm test`
Expected: All tests in `src/lib/__tests__/` pass.

- [ ] **Step 3: Run production build**

Run: `npm run build`
Expected: Build succeeds. Output in `dist/` directory.

- [ ] **Step 4: Test the production build**

Run: `npm run preview`
Expected: Production build serves correctly at the preview URL. All features work: form editor, raw editor, tag picker, test data panel, Discord preview, file load/save, API connection UI.

- [ ] **Step 5: Clean up old files**

Remove files that are no longer needed:

```bash
rm -f src/index.js
rm -f src/components/aboutmodal.jsx
rm -f src/components/codemodal.jsx
rm -f src/components/warningmodal.jsx
rm -f src/components/button.jsx
rm -f src/components/modal.jsx
rm -f src/components/modalcontainer.jsx
rm -f src/constants/embedschema.js
rm -f src/validation.js
rm -rf src/snippets
rm -f src/css/codemirror-one-dark.css
rm -f public/index.html
```

- [ ] **Step 6: Verify app still works after cleanup**

Run: `npm run dev`
Expected: App works as before. No import errors.

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "chore: clean up old files and finalize build configuration"
```

---

## Summary

| Task | Description | Key Output |
|------|-------------|------------|
| 1 | Upgrade to Vite + React 18 | Working dev server |
| 2 | Add Tailwind CSS | Styling system ready |
| 3 | Port Discord renderer | Embed preview works |
| 4 | Handlebars comparison/math/string/array helpers | Parity with Go backend |
| 5 | Handlebars game helpers (dummy) | Standalone mode works |
| 6 | Handlebars engine | Template compilation + rendering |
| 7 | Field definitions + test data | Tag picker data + sample contexts |
| 8 | App shell + three-panel layout | End-to-end rendering pipeline |
| 9 | Form editor + raw editor | Template editing with CM6 |
| 10 | Tag picker + test data panel | Field insertion + data tweaking |
| 11 | API client | Optional PoracleNG connection |
| 12 | Tests + cleanup | Production-ready build |
