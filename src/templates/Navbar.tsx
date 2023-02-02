import firebase from 'firebase/app';
import Link from 'next/link';

import { Section } from '../layout/Section';
import { NavbarTwoColumns } from '../navigation/NavbarTwoColumns';
import { auth, twitterProvider } from '../utils/firebase';
import { Logo } from './Logo';

const Links = [
  { href: 'https://usenostr.org/', text: 'What is Nostr?' },
  { href: '/stats', text: 'Statistics' },
  // { href: 'https://github.com/nostr-protocol/nostr', text: 'Nostr Protocol' },
  // { href: 'https://www.nostr.net/#clients', text: 'Clients' },
];

const Navbar = () => {
  const popupSignIn = async () => {
    auth
      .signInWithPopup(twitterProvider)
      .then((result) => {
        if (!result.credential) {
          alert('Error getting credentials from twitter API');
          return;
        }

        // eslint-disable-next-line prefer-destructuring
        const credential: firebase.auth.OAuthCredential = result.credential!;
        // const token = credential.accessToken!;
        // const { secret } = credential;
        // The signed-in user info.
        const { user }: any = result;
        // console.log(
        //   'logged in ',
        //   result,
        //   credential,
        //   user,
        //   `/twitter?accessToken=${credential.accessToken}&accessSecret=${credential.secret}&userId=${user?.providerData[0].uid}&screenName=${result?.additionalUserInfo?.profile?.screen_name}`
        // );
        // return;

        if (
          !credential.accessToken ||
          !credential.secret ||
          !user?.providerData[0].uid
        ) {
          alert('Error getting credentials from twitter API');
          return;
        }
        // send credential to twitter page for a checkmark list of twitter follows that are already on nostr.
        window.location.href = `/twitter?accessToken=${credential.accessToken}&accessSecret=${credential.secret}&userId=${user?.providerData[0].uid}&screenName=${result?.additionalUserInfo?.profile?.screen_name}`;
      })
      .catch((error) => {
        // Handle Errors here.
        const errorCode = error.code;
        const errorMessage = error.message;
        // The email of the user's account used.
        const { email } = error;
        // The firebase.auth.AuthCredential type that was used.
        const { credential } = error;
        // ...
        console.log(
          'signin error ',
          errorCode,
          errorMessage,
          email,
          credential
        );
      });
  };

  return (
    <Section yPadding="py-6" mxWidth="max-w-screen-xl">
      <NavbarTwoColumns logo={<Logo xl />}>
        {Links.map((link, index) => {
          return (
            <Link key={index} href={link.href}>
              <a target={link.href.includes('http') ? '_target' : ''}>
                <li className="py-2 px-6 text-base font-medium hover:bg-[#1d435814] rounded-full ease-in duration-100">
                  {link.text}
                </li>
              </a>
            </Link>
          );
        })}

        <li
          className="py-2 px-6 rounded-full text-base font-medium bg-[#5f338414] hover:bg-[#1d435836] cursor-pointer"
          onClick={popupSignIn}
        >
          Sign in with Twitter
        </li>
      </NavbarTwoColumns>
    </Section>
  );
};

export { Navbar };
