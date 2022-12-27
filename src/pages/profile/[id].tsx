import { Meta } from '../../layout/Meta';
import { Banner } from '../../templates/Banner';
import { Footer } from '../../templates/Footer';
import { Profile } from '../../templates/Profile';

const Page = () => (
  <div className="antialiased text-gray-600">
    <Meta title={'Profile Page'} description={'Social Media Connections'} />
    {/* <Hero /> */}
    {/* <Search /> */}
    <Profile />
    {/* <VerticalFeatures /> */}
    <Banner />
    <Footer />
  </div>
);

export default Page;
