import { useQuery } from '@tanstack/react-query';
import { tr } from './i18n/tr';
import { getHealth } from './lib/api';

function App() {
  const { data, isPending, isError } = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
  });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
      <h1 className="text-3xl font-semibold">{tr.common.appName}</h1>
      {isPending && <p className="text-slate-500">{tr.health.checking}</p>}
      {isError && <p className="text-red-500">{tr.health.error}</p>}
      {data && <p className="text-green-600">{tr.health.ok}</p>}
    </div>
  );
}

export default App;
