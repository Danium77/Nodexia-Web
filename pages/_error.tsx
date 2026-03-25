import * as Sentry from '@sentry/nextjs';
import type { NextPageContext } from 'next';
import Error from 'next/error';

const CustomErrorPage = ({ statusCode }: { statusCode: number }) => {
  return <Error statusCode={statusCode} />;
};

CustomErrorPage.getInitialProps = async (ctx: NextPageContext) => {
  await Sentry.captureUnderscoreErrorException(ctx);
  const statusCode = ctx.res?.statusCode ?? ctx.err?.statusCode ?? 500;
  return { statusCode };
};

export default CustomErrorPage;
