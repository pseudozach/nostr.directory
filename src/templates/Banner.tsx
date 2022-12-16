import Link from 'next/link';

import { Button } from '../button/Button';
import { CTABanner } from '../cta/CTABanner';
import { Section } from '../layout/Section';

const Banner = () => (
  <Section>
    <CTABanner
      title="Nostr is a distributed social media protocol that has a chance of working."
      subtitle="Give it a try."
      button={
        <Link href="https://coracle.social">
          <a target="_blank">
            <Button>coracle.social</Button>
          </a>
        </Link>
      }
    />
  </Section>
);

export { Banner };
