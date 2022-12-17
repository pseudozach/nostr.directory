import { ReactNode } from 'react';

type IHeroTwoButtonProps = {
  title: ReactNode;
  description: string;
  button: ReactNode;
  button2: ReactNode;
};

const HeroTwoButton = (props: IHeroTwoButtonProps) => (
  <header className="text-center">
    <h1 className="text-5xl text-gray-900 font-bold whitespace-pre-line leading-hero">
      {props.title}
    </h1>
    <div className="text-2xl mt-4 mb-16">{props.description}</div>

    {props.button2}
    {props.button}
  </header>
);

export { HeroTwoButton };
