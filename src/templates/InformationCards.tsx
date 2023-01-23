import React, { useEffect, useState } from 'react';

import InformationCard from '../cards/InformationCard';

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
const InformationCards = () => {
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

  const cardInfo = [
    {
      class: 'white-card',
      title: 'What is Nostr',
      description:
        'Nostr is not an app. It is a lightweight, simple yet extensible open protocol that allows building truly censorship resistant and decentralized social media platforms.',
      extra: "Here's a random client. Give it a try.",
      button_text: client.name,
      href: client.link,
      button_class: '',
    },
    {
      class: 'bg-card',
      title: 'Nostr Protocol',
      description:
        "The simplest open protocol that is able to create a censorship-resistant global 'social' network once and for all. It doesn't rely on any trusted central server, hence it is resilient; it is based on cryptographic keys and signatures, so it is tamperproof; it does not rely on P2P techniques, therefore it works.",
      // extra: "Here's a random client. Give it a try.",
      button_text: 'Go to Github',
      button_class: 'bg-card-a',
      href: 'https://github.com/pseudozach/nostr.directory',
    },
  ];

  return (
    <section className="max-w-screen-xl mx-auto px-3 pt-10 pb-10 md:flex-row flex-col flex gap-x-4">
      {cardInfo.map((card, index) => {
        return (
          <InformationCard
            key={index}
            class={card.class}
            title={card.title}
            description={card.description}
            extra={card.extra}
            button={card.button_text}
            button_class={card.button_class}
            href={card.href}
          />
        );
      })}
    </section>
  );
};

export default InformationCards;
