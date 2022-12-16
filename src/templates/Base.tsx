import { Meta } from '../layout/Meta';
import { AppConfig } from '../utils/AppConfig';
import { Banner } from './Banner';
import { Footer } from './Footer';
import { Hero } from './Hero';
import { List } from './List';
// import { Search } from './Search';
// import { VerticalFeatures } from './VerticalFeatures';

const Base = () => (
  <div className="antialiased text-gray-600">
    <Meta title={AppConfig.title} description={AppConfig.description} />
    <Hero />
    {/* <Search /> */}
    <List />
    {/* <VerticalFeatures /> */}
    <Banner />
    <Footer />
  </div>
);

export { Base };
