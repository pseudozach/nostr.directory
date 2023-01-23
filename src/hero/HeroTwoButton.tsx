import { ReactNode } from 'react';

type IHeroTwoButtonProps = {
  title: ReactNode;
  description: ReactNode;
  button: ReactNode;
  // button2: ReactNode;
  button3: ReactNode;
};

const HeroTwoButton = (props: IHeroTwoButtonProps) => (
  <header className="text-center">
    <h1 className="md:text-[56px] text-[40px] text-nostr-solid-darker font-black tracking-tighter whitespace-pre-line md:leading-hero leading-[48px]">
      {props.title}
    </h1>
    <div className="md:text-2xl text-lg font-medium md:font-semibold mt-4 mb-4 text-nostr-solid-darker max-w-[820px] m-auto">
      {props.description}
    </div>

    {/* {props.button2} */}
    {props.button}
    {props.button3}
  </header>
);

export { HeroTwoButton };
