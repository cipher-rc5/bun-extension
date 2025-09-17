import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

interface TabInfo {
  title: string;
  url: string;
}

const Popup: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Get current tab information
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        setActiveTab({ title: tabs[0].title || 'Unknown', url: tabs[0].url || 'Unknown' });
      }
      setIsLoading(false);
    });

    // Load stored count
    chrome.storage.sync.get(['count'], (result) => {
      setCount(result.count || 0);
    });
  }, []);

  const incrementCount = () => {
    const newCount = count + 1;
    setCount(newCount);
    chrome.storage.sync.set({ count: newCount });
  };

  const resetCount = () => {
    setCount(0);
    chrome.storage.sync.set({ count: 0 });
  };

  if (isLoading) {
    return (
      <div className='w-full h-96 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600'></div>
      </div>
    );
  }

  return (
    <div className='w-full min-h-[500px] bg-gradient-to-br from-blue-50 to-indigo-100 animate-fade-in'>
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
            <h1 className='text-lg font-semibold text-gray-900'>React Extension</h1>
            <p className='text-sm text-gray-500'>Powered by Bun & TypeScript</p>
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

          <div className='text-center space-y-4'>
            <div className='bg-gradient-to-r from-primary-50 to-indigo-50 rounded-lg p-6'>
              <p className='text-3xl font-bold text-primary-700'>{count}</p>
              <p className='text-sm text-gray-600 mt-1'>Total Clicks</p>
            </div>

            <div className='grid grid-cols-2 gap-3'>
              <button
                onClick={incrementCount}
                className='bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2'>
                <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 20 20'>
                  <path
                    fillRule='evenodd'
                    d='M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z'
                    clipRule='evenodd' />
                </svg>
                <span>Add</span>
              </button>

              <button
                onClick={resetCount}
                className='bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2'>
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

        {/* Actions */}
        <section className='bg-white rounded-lg shadow-sm p-4 animate-slide-up' style={{ animationDelay: '0.2s' }}>
          <h2 className='text-md font-medium text-gray-900 mb-3 flex items-center'>
            <svg className='w-4 h-4 mr-2 text-primary-600' fill='currentColor' viewBox='0 0 20 20'>
              <path
                fillRule='evenodd'
                d='M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z'
                clipRule='evenodd' />
            </svg>
            Quick Actions
          </h2>

          <div className='space-y-2'>
            <button className='w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200 flex items-center space-x-3'>
              <div className='w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center'>
                <svg className='w-4 h-4 text-green-600' fill='currentColor' viewBox='0 0 20 20'>
                  <path
                    fillRule='evenodd'
                    d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                    clipRule='evenodd' />
                </svg>
              </div>
              <div>
                <p className='text-sm font-medium text-gray-900'>Mark as Important</p>
                <p className='text-xs text-gray-500'>Save this page for later</p>
              </div>
            </button>

            <button className='w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200 flex items-center space-x-3'>
              <div className='w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center'>
                <svg className='w-4 h-4 text-blue-600' fill='currentColor' viewBox='0 0 20 20'>
                  <path d='M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z' />
                </svg>
              </div>
              <div>
                <p className='text-sm font-medium text-gray-900'>Share Page</p>
                <p className='text-xs text-gray-500'>Copy link to clipboard</p>
              </div>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};

// Mount the React app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Popup />);
}
