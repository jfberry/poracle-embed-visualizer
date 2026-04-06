import { useState, useMemo, useCallback } from 'react';
import { createEngine, renderDtsTemplate, registerPartials } from '../lib/handlebars-engine';

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

  const setPartials = useCallback(
    (partials) => {
      registerPartials(engine, partials);
    },
    [engine]
  );

  return { render, renderError, setPartials };
}
