import firebase from 'firebase/app';
import 'firebase/firestore';
import 'firebase/auth';
// console.log('process.env ', process.env);

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE__MEASUREMENT_ID,
};

let initFirebase;
if (!firebase.apps.length) {
  initFirebase = firebase.initializeApp(firebaseConfig);
} else {
  initFirebase = firebase.app();
}

const db = initFirebase.firestore();
const auth = initFirebase.auth();
const twitterProvider = new firebase.auth.TwitterAuthProvider();

export { db, auth, twitterProvider };
