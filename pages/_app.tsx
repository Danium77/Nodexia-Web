import '../styles/globals.css';
import type { AppProps } from "next/app";
import { UserProvider } from '../components/context/UserContext';
import { UserRoleProvider } from '../lib/contexts/UserRoleContext';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <UserProvider>
      <UserRoleProvider>
        <Component {...pageProps} />
      </UserRoleProvider>
    </UserProvider>
  );
}
