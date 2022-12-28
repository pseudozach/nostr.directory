import Link from 'next/link';

import { Background } from '../background/Background';
import { Section } from '../layout/Section';
import { NavbarTwoColumns } from '../navigation/NavbarTwoColumns';
import { Logo } from './Logo';

const Navbar = () => (
  <Background color="bg-gray-100">
    <Section yPadding="py-6">
      <NavbarTwoColumns logo={<Logo xl />}>
        <li>
          <Link href="https://getalby.com/p/nostrdirectory">
            <a target="_blank">Donate</a>
          </Link>
        </li>
        <li>
          <Link href="https://www.nostr.net/#clients">
            <a target="_blank">Clients</a>
          </Link>
        </li>
      </NavbarTwoColumns>
    </Section>
  </Background>
);

export { Navbar };
