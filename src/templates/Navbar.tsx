import { Twitter } from '@mui/icons-material';
import firebase from 'firebase/app';

import { Background } from '../background/Background';
import { OutlinedButton } from '../button/OutlinedButton';
import { Section } from '../layout/Section';
import { NavbarTwoColumns } from '../navigation/NavbarTwoColumns';
import { auth, twitterProvider } from '../utils/firebase';
import { Logo } from './Logo';

const Navbar = (props: any) => {
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
    <Background color="bg-gray-100">
      <Section yPadding="py-6">
        <NavbarTwoColumns logo={<Logo xl />}>
          {!props.hideLogin && (
            <li>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'end',
                }}
                className="text-xl my-4 cursor-pointer"
                onClick={popupSignIn}
              >
                <OutlinedButton>
                  <>
                    <Twitter /> Sign in with Twitter
                  </>
                </OutlinedButton>
              </div>
            </li>
          )}
          {/* <li>
          <Link href="https://www.nostr.net/#clients">
            <a target="_blank">Clients</a>
          </Link>
        </li> */}
        </NavbarTwoColumns>
      </Section>
    </Background>
  );
};

export { Navbar };
