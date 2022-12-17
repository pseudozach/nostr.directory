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

  // dont change the link every 5 seconds - bad idea
  // useEffect(() => {
  //   if (currentIndex === nostrClientArray.length - 1) {
  //     console.log('stopping');
  //     return;
  //   }
  //   console.log('useEffect');
  //   const interval = setInterval(() => {
  //     const updatedData = currentIndex + 1;
  //     setCurrentIndex(updatedData);
  //     setClient(nostrClientArray[updatedData]!);
  //     console.log('updated to ', nostrClientArray[updatedData]);
  //   }, 5000);

  //   console.log('clearInterval');
  //   // eslint-disable-next-line consistent-return
  //   return () => clearInterval(interval);
  // }, [currentIndex]);

  return (
    <Section>
      <CTABanner
        title="Nostr is a distributed social media protocol that has a chance of working."
        subtitle="Here's a random client. Give it a try."
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
