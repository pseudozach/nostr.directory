import { Meta } from '../../layout/Meta';
import { Footer } from '../../templates/Footer';
import { Navbar } from '../../templates/Navbar';
import { Profile } from '../../templates/Profile';

const Page = () => (
  <div className="antialiased text-gray-600">
    <Meta
      title={'Nostr Profile Page'}
      description={'Social Media Connections'}
    />
    <Navbar hideLogin="true" />
    <Profile />
    {/* <Banner /> */}
    <Footer />
  </div>
);

export default Page;
