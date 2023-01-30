import { Meta } from '../layout/Meta';
import { FollowList } from '../templates/FollowList';
import { Footer } from '../templates/Footer';
import InformationCards from '../templates/InformationCards';
import { Navbar } from '../templates/Navbar';
import { AppConfig } from '../utils/AppConfig';

const Index = () => (
  <div className="antialiased text-gray-600 ">
    <Meta title={AppConfig.title} description={AppConfig.description} />
    <Navbar hideLogin="true" />
    <FollowList />
    <InformationCards />
    <Footer />
  </div>
);

export default Index;
