import TemplateSelector from './TemplateSelector';

export default function TopBar({
  templates, currentTemplate, onSelectTemplate,
  onImport, onExport, onSave, connected,
  showMiddle, onToggleMiddle, sendTestButton,
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-700 text-sm">
      <div className="flex items-center gap-3">
        <span className="font-bold text-blue-400 shrink-0">Poracle DTS Editor</span>
        <span className="text-gray-600">|</span>
        <TemplateSelector
          templates={templates}
          currentTemplate={currentTemplate}
          onSelect={onSelectTemplate}
        />
      </div>
      <div className="flex items-center gap-2 shrink-0">
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
      </div>
    </div>
  );
}
