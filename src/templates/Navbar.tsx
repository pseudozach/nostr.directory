import Link from 'next/link';

import { Logo } from './Logo';
import { Section } from '../layout/Section';
import { NavbarTwoColumns } from '../navigation/NavbarTwoColumns';

const links = [
  { href: '/', text: 'Find people' },
  { href: '/stats', text: 'Historical statistics' },
  { href: 'https://usenostr.org/', text: 'What is Nostr?' },
];

// Browsing and signer-based identities do not require legacy Twitter OAuth.
const Navbar = (_props: { hideLogin?: boolean | string }) => (
  <Section yPadding="py-6" mxWidth="max-w-screen-xl">
    <NavbarTwoColumns logo={<Logo xl />}>
      {links.map((link) => (
        <li key={link.href}>
          <Link href={link.href}>
            <a
              className="py-2 px-6 text-base font-medium hover:bg-[#1d435814] rounded-full ease-in duration-100"
              {...(link.href.startsWith('https:')
                ? { target: '_blank', rel: 'noopener noreferrer' }
                : {})}
            >
              {link.text}
            </a>
          </Link>
        </li>
      ))}
    </NavbarTwoColumns>
  </Section>
);

export { Navbar };
