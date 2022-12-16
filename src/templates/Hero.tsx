import Link from 'next/link';

import { Background } from '../background/Background';
import { Button } from '../button/Button';
import { HeroOneButton } from '../hero/HeroOneButton';
import { Section } from '../layout/Section';
import { NavbarTwoColumns } from '../navigation/NavbarTwoColumns';
import { Logo } from './Logo';

const Hero = () => (
  <Background color="bg-gray-100">
    <Section yPadding="py-6">
      <NavbarTwoColumns logo={<Logo xl />}>
        <li>
          <Link href="https://github.com/pseudozach/nostr.directory">
            <a>GitHub</a>
          </Link>
        </li>
        {/* <li>
          <Link href="/">
            <a>Sign in</a>
          </Link>
        </li> */}
      </NavbarTwoColumns>
    </Section>

    <Section yPadding="pt-20 pb-32">
      <HeroOneButton
        title={
          <>
            {'Find your '} <span style={{ color: 'gray' }}>twitter</span>{' '}
            {' follows on '}{' '}
            <a
              href="https://github.com/nostr-protocol/nostr"
              target="_blank"
              rel="noreferrer"
              className="text-primary-500"
            >
              nostr
            </a>
            {/* {'\n'} */}
            {/* <span className="text-primary-500">React developers</span> */}
          </>
        }
        description="Add your nostr public key to the directory so your followers can find you"
        button={
          <Link href="https://twitter.com/intent/tweet?text=Verifying%20my%20account%20on%20nostr%0A%0AMy%20Public%20Key%3A%20%22Paste%20your%20nostr%20public%20key%20here%22%0A%0AFind%20others%20at%20https%3A%2F%2Fnostr.directory%20%40nostrdirectory%20%23nostr">
            <a target="_blank" rel="noreferrer">
              <Button xl>Tweet your nostr pubkey</Button>
            </a>
          </Link>
        }
      />
    </Section>
  </Background>
);

export { Hero };
