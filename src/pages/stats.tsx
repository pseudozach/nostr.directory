import { Meta } from '../layout/Meta';
import { Footer } from '../templates/Footer';
import InformationCards from '../templates/InformationCards';
import { Navbar } from '../templates/Navbar';
import { Statistics } from '../templates/Statistics';
import { AppConfig } from '../utils/AppConfig';

const Index = () => (
  <div className="antialiased text-gray-600 ">
    <Meta title={AppConfig.title} description={AppConfig.description} />
    <Navbar hideLogin="true" />
    <Statistics />
    <InformationCards />
    <Footer />
  </div>
);

export default Index;
