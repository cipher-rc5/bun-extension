import { useEffect, useRef, useState } from 'preact/hooks';
import { sendBackground } from '../shared/messages';
interface TabInfo {
  title: string;
  url: string;
}
export const Popup = () => {
  const [activeTab, setActiveTab] = useState<TabInfo | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const mounted = useRef(false);
  async function perform(action: 'getCounter' | 'incrementCounter' | 'resetCounter') {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      const result = await sendBackground({ action });
      if (mounted.current) setCount(result.count);
    } catch (error) {
      if (mounted.current) setError(error instanceof Error ? error.message : 'Counter could not be saved');
    } finally {
      busy.current = false;
      if (mounted.current) setPending(false);
    }
  }
  useEffect(() => {
    mounted.current = true;
    void perform('getCounter');
    void chrome.tabs.query({ active: true, currentWindow: true }).then(tabs => {
      if (mounted.current) setActiveTab({ title: tabs[0]?.title ?? 'Unavailable', url: tabs[0]?.url ?? 'Unavailable' });
    }).catch(() => {
      if (mounted.current) setActiveTab({ title: 'Tab information unavailable', url: 'Unavailable' });
    });
    return () => {
      mounted.current = false;
    };
  }, []);
  return (
    <div className='w-full min-h-125 bg-linear-to-br from-blue-50 to-indigo-100 animate-fade-in'>
      {/* Header */}
      <header className='bg-white shadow-sm border-b border-gray-200 p-4'>
        <div className='flex items-center space-x-3'>
          <div className='w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center'>
            <svg className='w-5 h-5 text-white' fill='currentColor' viewBox='0 0 20 20'>
              <path
                fillRule='evenodd'
                d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                clipRule='evenodd' />
            </svg>
          </div>
          <div>
            <h1 className='text-lg font-semibold text-gray-900'>Browser Extension</h1>
            <p className='text-sm text-gray-500'>Your tab and click counter</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className='p-4 space-y-6'>
        {/* Current Tab Info */}
        <section className='bg-white rounded-lg shadow-sm p-4 animate-slide-up'>
          <h2 className='text-md font-medium text-gray-900 mb-3 flex items-center'>
            <svg className='w-4 h-4 mr-2 text-primary-600' fill='currentColor' viewBox='0 0 20 20'>
              <path
                fillRule='evenodd'
                d='M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z'
                clipRule='evenodd' />
            </svg>
            Current Tab
          </h2>
          <div className='space-y-2'>
            <div>
              <p className='text-xs font-medium text-gray-500 uppercase tracking-wide'>Title</p>
              <p className='text-sm text-gray-900 truncate' title={activeTab?.title}>{activeTab?.title}</p>
            </div>
            <div>
              <p className='text-xs font-medium text-gray-500 uppercase tracking-wide'>URL</p>
              <p className='text-sm text-gray-600 truncate' title={activeTab?.url}>{activeTab?.url}</p>
            </div>
          </div>
        </section>

        {/* Counter Section */}
        <section className='bg-white rounded-lg shadow-sm p-4 animate-slide-up' style={{ animationDelay: '0.1s' }}>
          <h2 className='text-md font-medium text-gray-900 mb-4 flex items-center'>
            <svg className='w-4 h-4 mr-2 text-primary-600' fill='currentColor' viewBox='0 0 20 20'>
              <path
                fillRule='evenodd'
                d='M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.414L10 9.586V6z'
                clipRule='evenodd' />
            </svg>
            Click Counter
          </h2>

          <div className='text-center space-y-4' aria-busy={pending}>
            {error && <p role='alert' className='text-sm text-red-700'>{error}</p>}
            {count === null && !pending && (
              <button onClick={() => void perform('getCounter')} className='underline text-primary-700'>Try again</button>
            )}
            <div className='bg-linear-to-br from-primary-50 to-indigo-50 rounded-lg p-6'>
              <p aria-label='Click count' aria-live='polite' className='text-3xl font-bold text-primary-700'>{count ?? '—'}</p>
              <p className='text-sm text-gray-600 mt-1'>Total Clicks</p>
            </div>

            <div className='grid grid-cols-2 gap-3'>
              <button
                disabled={pending || count === null}
                onClick={() => void perform('incrementCounter')}
                className='bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-wait flex items-center justify-center space-x-2'>
                <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 20 20'>
                  <path
                    fillRule='evenodd'
                    d='M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z'
                    clipRule='evenodd' />
                </svg>
                <span>Add</span>
              </button>

              <button
                disabled={pending}
                onClick={() => void perform('resetCounter')}
                className='bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-wait flex items-center justify-center space-x-2'>
                <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 20 20'>
                  <path
                    fillRule='evenodd'
                    d='M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z'
                    clipRule='evenodd' />
                </svg>
                <span>Reset</span>
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
