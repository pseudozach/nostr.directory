import { ReactNode } from 'react';

type ISectionProps = {
  title?: string;
  description?: string;
  yPadding?: string;
  children: ReactNode;
  mxWidth?: string;
};

const Section = (props: ISectionProps) => (
  <section
    className={`${
      props.mxWidth ? props.mxWidth : 'max-w-screen-xl'
    } mx-auto px-3 ${props.yPadding ? props.yPadding : 'py-16'}`}
  >
    {(props.title || props.description) && (
      <div className="mb-6 text-center">
        {props.title && (
          <h1 className="text-2xl text-gray-900 font-black tracking-tight">
            {props.title}
          </h1>
        )}
        {props.description && (
          <div className="mt-4 text-xl md:px-20 text-[14px] max-w-[820px] m-auto">
            {props.description}
          </div>
        )}
      </div>
    )}

    {props.children}
  </section>
);

export { Section };
