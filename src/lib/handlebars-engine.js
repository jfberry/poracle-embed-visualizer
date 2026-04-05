import Handlebars from 'handlebars';
import { registerAllHelpers } from './handlebars-helpers';
import { registerGameHelpers } from './handlebars-game-helpers';

export function createEngine() {
  const hbs = Handlebars.create();
  registerAllHelpers(hbs);
  registerGameHelpers(hbs);
  return hbs;
}

/**
 * Register Handlebars partials on the engine.
 * partials is an object: { name: templateString, ... }
 */
export function registerPartials(engine, partials) {
  // Unregister any previously registered partials
  for (const name of Object.keys(engine.partials)) {
    engine.unregisterPartial(name);
  }
  if (partials) {
    for (const [name, template] of Object.entries(partials)) {
      engine.registerPartial(name, template);
    }
  }
}

export function renderTemplate(engine, templateStr, data) {
  const compiled = engine.compile(templateStr, { noEscape: true });
  return compiled(data);
}

export function renderDtsTemplate(engine, templateObj, data) {
  const templateStr = JSON.stringify(templateObj);
  const rendered = renderTemplate(engine, templateStr, data);
  try {
    return JSON.parse(rendered);
  } catch {
    return null;
  }
}
