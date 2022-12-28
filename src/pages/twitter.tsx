import { Meta } from '../layout/Meta';
import { FollowList } from '../templates/FollowList';
import { Footer } from '../templates/Footer';
import { AppConfig } from '../utils/AppConfig';

const Index = () => (
  <div className="antialiased text-gray-600">
    <Meta title={AppConfig.title} description={AppConfig.description} />
    <FollowList />
    <Footer />
  </div>
);

export default Index;
