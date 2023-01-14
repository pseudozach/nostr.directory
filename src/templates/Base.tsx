import { Meta } from '../layout/Meta';
import { AppConfig } from '../utils/AppConfig';
import { Banner } from './Banner';
import { Footer } from './Footer';
import { Hero } from './Hero';
import { List } from './List';
import { Navbar } from './Navbar';
import { VerticalFeatures } from './VerticalFeatures';
// import { Search } from './Search';

const Base = () => (
  <div className="antialiased text-gray-600">
    <Meta title={AppConfig.title} description={AppConfig.description} />
    <Navbar />
    <Hero />
    {/* <Search /> */}
    <List />
    <VerticalFeatures />
    <Banner />
    <Footer />
  </div>
);

export { Base };
