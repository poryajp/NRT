import React, { useState, useRef, useCallback, useEffect } from 'react';
import { RequestType, PingResult } from './types';
import LatencyChart from './LatencyChart';

const App: React.FC = () => {
  const [host, setHost] = useState<string>('google.com');
  const [requestType, setRequestType] = useState<RequestType>(RequestType.HTTPS);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [results, setResults] = useState<PingResult[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>('Ready to start.');
  const [averageLatency, setAverageLatency] = useState<number | null>(null);
  const [minLatency, setMinLatency] = useState<number | null>(null);
  const [maxLatency, setMaxLatency] = useState<number | null>(null);

  const intervalRef = useRef<number | null>(null);
  const testCounterRef = useRef<number>(0);

  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';

  useEffect(() => {
    const successfulTests = results.filter(r => r.time !== null && !r.error);
    
    // We need at least two successful tests to calculate stats without the first one.
    if (successfulTests.length > 1) {
      // Exclude the oldest test, which is the last one in the array because new results are prepended.
      const testsForCalculation = successfulTests.slice(0, -1);
      
      const times = testsForCalculation.map(r => r.time!);
      const totalTime = times.reduce((acc, t) => acc + t, 0);
      setAverageLatency(Math.round(totalTime / testsForCalculation.length));
      setMinLatency(Math.min(...times));
      setMaxLatency(Math.max(...times));
    } else {
      // If there's 0 or 1 successful test, we can't show stats that exclude the first one.
      setAverageLatency(null);
      setMinLatency(null);
      setMaxLatency(null);
    }
  }, [results]);

  const addResult = (result: Omit<PingResult, 'id' | 'timestamp'>) => {
    setResults(prev => [
      { 
        ...result,
        id: testCounterRef.current++,
        timestamp: new Date().toLocaleTimeString() 
      },
      ...prev
    ].slice(0, 40));
  };
  
  const runTest = useCallback(async () => {
    const currentHost = host;
    if (!currentHost) {
      setStatusMessage('Error: Host is required.');
      return;
    }
    
    setStatusMessage(`Pinging ${currentHost}...`);
    const startTime = performance.now();
    const timeout = 2000;

    if (requestType === RequestType.HTTPS) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      const url = `https://${currentHost}?t=${Date.now()}`;
        
      try {
        await fetch(url, { 
          signal: controller.signal, 
          cache: 'no-store', 
          mode: 'no-cors' 
        });
        const endTime = performance.now();
        clearTimeout(timeoutId);
        const duration = endTime - startTime;
        addResult({ type: requestType, time: Math.round(duration), status: 'OK' });
      } catch (error) {
        clearTimeout(timeoutId);
        let errorMsg = 'Request failed.';
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            errorMsg = `Timeout (${timeout}ms)`;
          } else {
            errorMsg = 'Failed. Check host, network, or console for errors.';
          }
        }
        addResult({ type: requestType, time: null, status: 'Error', error: errorMsg });
      }
    } else if (requestType === RequestType.HTTP) {
      let done = false;
      const img = new Image();
      
      const recordResult = (time: number | null, status: 'OK' | 'Error', error?: string) => {
        if (done) return;
        done = true;
        clearTimeout(timeoutId);
        img.onload = null;
        img.onerror = null;
        img.src = '';
        
        if (status === 'OK' && time !== null) {
            addResult({ type: requestType, time: time, status: status });
        } else {
            addResult({ type: requestType, time: null, status: status, error: error });
        }
      };
      
      const timeoutId = setTimeout(() => {
        recordResult(null, 'Error', `Timeout (${timeout}ms)`);
      }, timeout);

      const handleSuccess = () => {
        const endTime = performance.now();
        recordResult(Math.round(endTime - startTime), 'OK');
      };

      img.onload = handleSuccess;
      img.onerror = handleSuccess; // For this technique, error often means success.
      
      img.src = `http://${currentHost}?t=${Date.now()}`;
    }
  }, [host, requestType]);
  
  const handleStartStop = () => {
    if (isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      setIsRunning(false);
      setStatusMessage('Stopped by user.');
    } else {
      if (!host) {
        setStatusMessage('Error: Host cannot be empty.');
        return;
      }
      setResults([]);
      testCounterRef.current = 0;
      setIsRunning(true);
      setStatusMessage('Starting tests...');
      runTest(); // Run immediately once
      intervalRef.current = window.setInterval(runTest, 2000);
    }
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const latestResult = results[0];

  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">Network Response Tester</h1>
          <p className="text-gray-400 mt-2">Measure network latency directly from your browser.</p>
        </header>

        <main>
          <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl shadow-2xl shadow-blue-500/10 p-6 border border-gray-800">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-6">
                <label htmlFor="host" className="block text-sm font-medium text-gray-400 mb-1">Host or IP</label>
                <input type="text" id="host" value={host} onChange={e => setHost(e.target.value)} disabled={isRunning} className="w-full bg-gray-850 border border-gray-700 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition disabled:opacity-50" placeholder="e.g., example.com"/>
              </div>
              <div className="md:col-span-3">
                <label htmlFor="requestType" className="block text-sm font-medium text-gray-400 mb-1">Type</label>
                <div className="relative">
                  <select 
                    id="requestType" 
                    value={requestType} 
                    onChange={e => setRequestType(e.target.value as RequestType)} 
                    disabled={isRunning} 
                    className="w-full bg-gray-850 border border-gray-700 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition disabled:opacity-50 appearance-none"
                  >
                    <option value={RequestType.HTTPS}>HTTPS GET</option>
                    <option value={RequestType.HTTP} disabled={isHttps}>HTTP GET</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
                 {isHttps && (
                    <p className="text-xs text-gray-500 mt-1 pl-1">HTTP is disabled on secure pages.</p>
                 )}
              </div>
              <div className="md:col-span-3">
                <button onClick={handleStartStop} className={`w-full font-bold py-2 px-4 rounded-md transition-all duration-300 ease-in-out flex items-center justify-center ${isRunning ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                  {isRunning ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      Stop
                    </>
                  ) : 'Start'}
                </button>
              </div>
            </div>
          </div>
          
          <div className="mt-8">
            <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-800 flex justify-between items-center">
              <p className="text-gray-400">Status: <span className="text-white font-medium">{statusMessage}</span></p>
            </div>
          </div>

          {(results.length > 0 || isRunning) && (
             <div className="mt-8 grid grid-cols-2 gap-4 text-center">
                <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-800">
                    <h3 className="text-gray-400 text-sm font-medium">Total Time (ms)</h3>
                    <p className={`text-4xl font-bold mt-2 ${latestResult?.error ? 'text-red-500' : 'text-blue-400'}`}>
                        {latestResult?.time !== null && latestResult?.time !== undefined ? latestResult.time : '-'}
                    </p>
                </div>
                 <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-800">
                    <h3 className="text-gray-400 text-sm font-medium">Average Latency (ms)</h3>
                    <p className="text-4xl font-bold mt-2 text-yellow-400">
                        {averageLatency !== null ? averageLatency : '-'}
                    </p>
                </div>
                <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-800">
                    <h3 className="text-gray-400 text-sm font-medium">Min Latency (ms)</h3>
                    <p className="text-4xl font-bold mt-2 text-green-400">
                        {minLatency !== null ? minLatency : '-'}
                    </p>
                </div>
                <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-800">
                    <h3 className="text-gray-400 text-sm font-medium">Max Latency (ms)</h3>
                    <p className="text-4xl font-bold mt-2 text-red-500">
                        {maxLatency !== null ? maxLatency : '-'}
                    </p>
                </div>
            </div>
          )}

          {results.length > 0 && <LatencyChart results={results} />}

          {results.length > 0 && (
            <div className="mt-8 bg-gray-900/50 rounded-lg border border-gray-800 p-2 sm:p-4">
              <h2 className="text-lg font-semibold mb-4 px-2">History</h2>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-400 uppercase bg-gray-900 sticky top-0">
                    <tr>
                      <th scope="col" className="px-4 py-3">Time</th>
                      <th scope="col" className="px-4 py-3 text-right">Duration (ms)</th>
                      <th scope="col" className="px-4 py-3 text-right">Status</th>
                      <th scope="col" className="px-4 py-3">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map(r => (
                      <tr key={r.id} className="border-b border-gray-800 hover:bg-gray-850/50">
                        <td className="px-4 py-2 font-mono text-gray-400">{r.timestamp}</td>
                        <td className={`px-4 py-2 font-mono text-right ${r.error ? 'text-red-400' : 'text-gray-400'}`}>{r.time ?? 'N/A'}</td>
                        <td className={`px-4 py-2 font-mono font-bold text-right ${r.error ? 'text-red-400' : 'text-green-400'}`}>{r.status}</td>
                        <td className="px-4 py-2 text-red-400 text-xs">{r.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;