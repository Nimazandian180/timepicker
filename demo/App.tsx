import { Footer, Header, Hero } from './Chrome';
import { PluginDemo } from './PluginDemo';
import { Playground } from './Playground';

/** Assembles the showcase page. */
export function App() {
  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px' }}>
      <Header />
      <Hero />
      <Playground />
      <div style={{ marginTop: 24 }}>
        <PluginDemo />
      </div>
      <Footer />
    </div>
  );
}
