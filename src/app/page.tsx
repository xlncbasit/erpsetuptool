import { Suspense } from 'react';

import Loading from '@/components/ui/loading';
import RedirectComponent from '@/components/RedirectComponent';

export default function Home() {
  return (
    <Suspense fallback={<Loading />}>
      <RedirectComponent />
    </Suspense>
  );
}