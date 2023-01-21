import { Meta } from '../layout/Meta';
import { AppConfig } from '../utils/AppConfig';
import { Footer } from './Footer';
import { Hero } from './Hero';
import InformationCards from './InformationCards';
import { List } from './List';
import { Navbar } from './Navbar';
// import { Search } from './Search';

const Base = () => (
  <div className="antialiased text-gray-600 bg-[url('/assets/images/bg.svg')] bg-no-repeat bg-contain bg-top">
    <Meta title={AppConfig.title} description={AppConfig.description} />
    <Navbar />
    <Hero />
    {/* <Search /> */}
    <List />
    {/* <VerticalFeatures /> */}
    {/* <Banner /> */}
    <InformationCards />
    <Footer />
  </div>
);

export { Base };
