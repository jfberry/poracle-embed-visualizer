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
