import Link from 'next/link';

import { Section } from '../layout/Section';
import { NavbarTwoColumns } from '../navigation/NavbarTwoColumns';
import { Logo } from './Logo';

const Links = [
  { href: 'https://getalby.com/p/nostrdirectory', text: 'What is Nostr' },
  { href: 'https://getalby.com/p/nostrdirectory', text: 'Nostr Protocol' },
  { href: 'https://getalby.com/p/nostrdirectory', text: 'Clients' },
];

const Navbar = () => (
  <Section yPadding="py-6" mxWidth="max-w-screen-xl">
    <NavbarTwoColumns logo={<Logo xl />}>
      {Links.map((link, index) => {
        return (
          <Link key={index} href={link.href}>
            <a target="_blank">
              <li className="py-2 px-6 text-base font-medium hover:bg-[#1d435814] rounded-full ease-in duration-100">
                {link.text}
              </li>
            </a>
          </Link>
        );
      })}

      <Link href="https://www.nostr.net/#clients">
        <a target="_blank">
          <li className="py-2 px-6 rounded-full text-base font-medium bg-[#5f338414]">
            Sign in with Twitter
          </li>
        </a>
      </Link>
    </NavbarTwoColumns>
  </Section>
);

export { Navbar };
