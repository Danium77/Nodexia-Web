import '../styles/globals.css';
import type { AppProps } from "next/app";
import { UserRoleProvider } from '../lib/contexts/UserRoleContext';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <UserRoleProvider>
      <Component {...pageProps} />
    </UserRoleProvider>
  );
}
