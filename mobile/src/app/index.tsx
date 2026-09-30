import { Redirect } from 'expo-router';

import { useApp } from '../state/AppState';

export default function Index() {
  const { loggedIn } = useApp();
  return <Redirect href={loggedIn ? '/home' : '/login'} />;
}
