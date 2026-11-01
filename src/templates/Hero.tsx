import React from 'react';

import { HeroTwoButton } from '../hero/HeroTwoButton';
import { Section } from '../layout/Section';
import Popup from '../popup/Popup';

const Hero = () => (
  <Section yPadding="pt-20 pb-10">
    <HeroTwoButton
      title={
        <>
          Find people on{' '}
          <span className="bg-gradient-to-t from-[#5684C9] to-[#D3A7FF] bg-clip-text text-transparent">
            Nostr
          </span>
        </>
      }
      description={
        <>
          Search real people, inspect linked-account evidence, and keep your
          public NIP39 account list in your own control. No sign-in needed to
          browse.
        </>
      }
      button={<a href="#people-directory">Browse people</a>}
      button3={<Popup buttonText="Link accounts" />}
    />
  </Section>
);

export { Hero };
