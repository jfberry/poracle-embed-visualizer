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
