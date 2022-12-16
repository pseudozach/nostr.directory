import { useEffect, useState } from 'react';

import Link from 'next/link';

import { Button } from '../button/Button';
import { CTABanner } from '../cta/CTABanner';
import { Section } from '../layout/Section';

const nostrClientArray = [
  {
    name: 'coracle.social',
    link: 'https://coracle.social',
  },
  {
    name: 'nostr.rocks',
    link: 'https://nostr.rocks',
  },
  {
    name: 'astral.ninja',
    link: 'https://astral.ninja',
  },
  {
    name: 'damus (iOS)',
    link: 'https://testflight.apple.com/join/CLwjLxWl',
  },
  {
    name: 'anigma.io',
    link: 'https://anigma.io',
  },
  {
    name: 'nostr.ch',
    link: 'https://nostr.ch',
  },
];

const Banner = () => {
  const [client, setClient] = useState({
    name: 'coracle.social',
    link: 'https://coracle.social',
  });
  useEffect(() => {
    const randomClient =
      nostrClientArray[Math.floor(Math.random() * nostrClientArray.length)] ||
      client;
    setClient(randomClient);
  }, [client]);
  return (
    <Section>
      <CTABanner
        title="Nostr is a distributed social media protocol that has a chance of working."
        subtitle="Give it a try."
        button={
          <Link href={client.link}>
            <a target="_blank">
              <Button>{client.name}</Button>
            </a>
          </Link>
        }
      />
    </Section>
  );
};

export { Banner };
