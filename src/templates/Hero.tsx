import Link from 'next/link';

import { Button } from '../button/Button';
import { HeroTwoButton } from '../hero/HeroTwoButton';
import { Section } from '../layout/Section';
import Popup from '../popup/Popup';

const Hero = () => (
  <Section yPadding="pt-20 pb-10">
    <HeroTwoButton
      title={
        <>
          {'Find your twitter follows on '}{' '}
          <a
            href="https://github.com/nostr-protocol/nostr"
            target="_blank"
            rel="noreferrer"
            className="bg-gradient-to-t from-[#5684C9] to-[#D3A7FF] bg-clip-text text-transparent"
          >
            nostr
          </a>
          {/* {'\n'} */}
          {/* <span className="text-primary-500">React developers</span> */}
        </>
      }
      description={
        <>
          Add your nostr public key to the directory so your followers can find
          you at{' '}
          <span className="bg-gradient-to-t from-[#46BFEE] to-[#1ADACE] bg-clip-text text-transparent">
            yourtwitterhandle@nostr.directory
          </span>
        </>
      }
      button={
        <Link href="https://twitter.com/intent/tweet?text=Verifying%20my%20account%20on%20nostr%0A%0AMy%20Public%20Key%3A%20%22Paste%20your%20nostr%20public%20key%20here%22%0A%0AFind%20others%20at%20https%3A%2F%2Fnostr.directory%20%40nostrdirectory%20%23nostr">
          <a target="_blank" rel="noreferrer" className="m-2">
            <Button main>Tweet your nostr pubkey</Button>
          </a>
        </Link>
      }
      // button2={
      //   <Link href="https://www.nostr.net">
      //     <a target="_blank" rel="noreferrer" className="m-2">
      //       <OutlinedButton xl>Find a Client. Join nostr.</OutlinedButton>
      //     </a>
      //   </Link>
      // }
      button3={
        <Popup buttonText="Verify your pubkey on nostr" />
        // <OutlinedButton xl>Verify your pubkey on nostr</OutlinedButton>
      }
    />
  </Section>
);

export { Hero };
