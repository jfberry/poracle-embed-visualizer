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
