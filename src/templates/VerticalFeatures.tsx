import Image from 'next/image';

import { VerticalFeatureRow } from '../feature/VerticalFeatureRow';
import { Section } from '../layout/Section';

const VerticalFeatures = () => (
  <Section
    title="A Digital Identity You Truly Own"
    description="At nostr.directory we are building an online identity registry anchored to nostr public keys."
  >
    <div style={{ width: '100%', height: '300px', position: 'relative' }}>
      <Image
        src="/assets/images/badges.png"
        alt="sample profile page"
        layout="fill"
        objectFit="contain"
      />
    </div>
    <VerticalFeatureRow
      title="Connect Social Networks"
      description="Verify your Twitter, Telegram, GitHub (coming soon) and other social media accounts to signal your online presence."
      image="/assets/images/social.svg"
      imageAlt="Connect Social Networks alt text"
    />
    <VerticalFeatureRow
      title="Web of Trust"
      description="Build your reputation by getting attestations from your connections. Your interactions and activities on nostr will boost your score."
      image="/assets/images/wot.svg"
      imageAlt="Web of Trust alt text"
      reverse
    />
    <VerticalFeatureRow
      title="Become un-Deplatformable"
      description="Your digital identity, connections and communication channels are unmistakeably yours. Validated cryptographically."
      image="/assets/images/platform.svg"
      imageAlt="Become un-Unplatformable alt text"
    />
  </Section>
);

export { VerticalFeatures };
