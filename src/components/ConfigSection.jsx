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
