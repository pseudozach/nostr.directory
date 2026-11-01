import { Footer } from './Footer';
import { Hero } from './Hero';
import InformationCards from './InformationCards';
import { List } from './List';
import { Navbar } from './Navbar';
import { Meta } from '../layout/Meta';
import { AppConfig } from '../utils/AppConfig';
// import { Search } from './Search';

const Base = () => (
  <div className="antialiased text-gray-600 overflow-hidden">
    <Meta title={AppConfig.title} description={AppConfig.description} />
    <Navbar />
    <main>
      <Hero />
      <List />
      <InformationCards />
    </main>
    <Footer />
  </div>
);

export { Base };
