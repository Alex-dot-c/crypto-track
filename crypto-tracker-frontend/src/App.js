import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, BarElement } from 'chart.js';
import './App.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, BarElement);

const API_URL = 'https://crypto-tracker-backend-4xaw.onrender.com';

function App() {
  const [coins, setCoins] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [coinHistory, setCoinHistory] = useState(null);

  const [prompt, setPrompt] = useState('');
  const [aiResponse, setAIResponse] = useState('');
  const [aiLoading, setAILoading] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [chartPeriod, setChartPeriod] = useState('30');


  const fetchCoinHistory = useCallback((coinId, days) => {
    setError(null);
    setCoinHistory(null);
    setLoading(true);
    axios
      .get(`${API_URL}/api/coin/${coinId}/history?days=${days}`) // Updated to pass days as query param (requires backend change)
      .then((chartResponse) => {
        const prices = chartResponse.data.prices.map(price => price[1]);
        const volumes = chartResponse.data.total_volumes ?.map(volume => volume[1]) || []; // Assuming backend provides volumes
        const labels = chartResponse.data.prices.map(price => new Date(price[0]).toLocaleDateString());
        setCoinHistory({
          labels: labels,
          datasets: [
            {
              type: 'line',
              label: `${selectedCoin.name} Price (USD) - ${getPeriodLabel(days)}`,
              data: prices,
              borderColor: 'rgba(75,192,192,1)',
              yAxisID: 'y',
              tension: 0.1
            },
            {
              type: 'bar',
              label: `${selectedCoin.name} Volume - ${getPeriodLabel(days)}`,
              data: volumes,
              backgroundColor: 'rgba(153,102,255,0.4)',
              yAxisID: 'y1',
            }
          ]
        });
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching coin history:', error);
        setError('Failed to load coin history');
        setLoading(false);
      });
  }, []);


  useEffect(() => {
    if (activeTab === 'home') {
      setLoading(true);
      axios
        .get(`${API_URL}/api/coins`)
        .then((response) => {
          setCoins(response.data);
          setLoading(false);
        })
        .catch((error) => {
          console.error('Error fetching coins:', error.response ?.data || error.message);
          setError(error.response ?.data ?.error || 'Failed to load coin data');
          setLoading(false);
        });
    }

  }, [activeTab]);




  const handleSymbolClick = useCallback((coin) => {
    const timer = setTimeout(() => {
      setSelectedCoin(coin);
      fetchCoinHistory(coin.id, chartPeriod);
      setActiveTab('history');
    }, 500); // 500ms debounce
    return () => clearTimeout(timer);
  }, [chartPeriod, fetchCoinHistory]);

  const handlePeriodChange = (days) => {
    setChartPeriod(days);
    if (selectedCoin) {
      fetchCoinHistory(selectedCoin.id, days);
    }
  };

  const filteredCoins = coins.filter(coin =>
    coin.name.toLowerCase().includes(search.toLowerCase()) ||
    coin.symbol.toLowerCase().includes(search.toLowerCase())
  );

  const handleAskAI = async () => {
    if (!prompt) return;
    setAILoading(true);
    setAIResponse('');
    setSelectedCoin(null);
    setCoinHistory(null);
    setError(null);
    try {
      const res = await axios.post(`${API_URL}/api/grok`, { prompt });
      setAIResponse(res.data.ai || 'No response from AI');
      if (res.data.coin && res.data.chart) {
        setSelectedCoin(res.data.coin);
        const prices = res.data.chart.prices.map(price => price[1]);
        const volumes = res.data.chart.total_volumes ?.map(volume => volume[1]) || []; // Add volume
        const labels = res.data.chart.prices.map(price => new Date(price[0]).toLocaleDateString());
        setCoinHistory({
          labels: labels,
          datasets: [{
            type: 'line',
            label: `${res.data.coin.name} Price (USD) - Last 30 days`,
            data: prices,
            borderColor: 'rgba(75,192,192,1)',
            yAxisID: 'y',
            tension: 0.1
          },
          {
            type: 'bar',
            label: `${res.data.coin.name} Volume - Last 30 days`,
            data: volumes,
            backgroundColor: 'rgba(153,102,255,0.4)',
            yAxisID: 'y1',
          }]
        });
      }
      setPrompt('');
    } catch (err) {
      setAIResponse('Error communicating with AI');
    }
    setAILoading(false);
  };

  const getPeriodLabel = (period) => {
    switch (period) {
      case '1':
        return 'Last 1 Day';
      case '7':
        return 'Last 7 Days';
      case '30':
        return 'Last 30 Days';
      case '90': return 'Last 90 Days';
      case '365':
        return 'Last 1 Year';
      case 'max':
        return 'All Time';
      default:
        return 'Unknown Period';
    }
  };


  return (
    <div className="App">
      <h1>Crypto Market Tracker</h1>
      <nav style={{ marginBottom: '20px' }}>
        <button onClick={() => setActiveTab('home')} style={{ marginRight: '10px' }}>Home (Coin List)</button>
        <button onClick={() => setActiveTab('ai')} style={{ marginRight: '10px' }}>AI Assistant</button>
        <button onClick={() => setActiveTab('history')}>Coin History</button>
      </nav>

      {activeTab === 'home' && (
        <>
          <input
            type="text"
            placeholder="Search for a coin..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ marginBottom: '20px', padding: '10px', width: '300px' }}
          />
          {loading && <p>Loading coins...</p>}
          {error && <p style={{ color: 'red' }}>{error}</p>}
          {!loading && !error && (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Symbol</th>
                  <th>Price (USD)</th>
                  <th>24h Change (%)</th>
                </tr>
              </thead>
              <tbody>
                {filteredCoins.map((coin) => (
                  <tr key={coin.id}>
                    <td>{coin.name}</td>
                    <td
                      style={{ color: 'blue', cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={() => {
                        handleSymbolClick(coin);
                        setActiveTab('history'); // Switch to history tab on symbol click
                      }}
                    >
                      {coin.symbol.toUpperCase()}
                    </td>
                    <td>${coin.current_price.toFixed(2)}</td>
                    <td
                      style={{
                        color: coin.price_change_percentage_24h >= 0 ? 'green' : 'red',
                      }}
                    >
                      {coin.price_change_percentage_24h.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}


      {/*AI assistant prompt section */}

      {activeTab === 'ai' && (
        <div style={{ margin: '20px 0', padding: '16px', background: '#f3f5fa', borderRadius: 8 }}>
          <h2>Ask the AI Assistant</h2>
          <input
            type="text"
            placeholder="Ask about a coin (e.g. BTC or Ethereum)..."
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            style={{ width: 300, padding: 10, marginRight: 10 }}
            onKeyDown={e => { if (e.key === 'Enter') handleAskAI(); }}
            disabled={aiLoading}
          />
          <button onClick={handleAskAI} disabled={aiLoading || !prompt}>
            {aiLoading ? "Asking..." : "Ask AI"}
          </button>
          {aiResponse && (
            <div style={{ background: '#fff', padding: '16px', marginTop: '12px', borderRadius: 6, border: '1px solid #eaeaea' }}>
              <strong>AI Response:</strong>
              <div style={{ marginTop: 8, whiteSpace: 'pre-line' }}>{aiResponse}</div>
            </div>
          )}
          {selectedCoin && coinHistory && (
            <div style={{ width: '600px', margin: '20px auto' }}>
              <h2>{selectedCoin.name} Price History (30 Days)</h2>
              <Line data={coinHistory} options={{
                responsive: true, plugins: { legend: { position: 'top' } },
                scales: {
                  y: {
                    type: 'linear',
                    position: 'left',
                  },
                  y1: {
                    type: 'linear',
                    position: 'right',
                    grid: {
                      drawOnChartArea: false, // only want the grid lines for one axis to show up
                    },
                  }
                }
              }} />
            </div>
          )}
        </div>
      )}


      {activeTab === 'history' && (
        <div>
          {selectedCoin ? (
            <div>
              <h2>{selectedCoin.name.toUpperCase()} Price and Volume - {getPeriodLabel(chartPeriod)}</h2>
              <div style={{ marginBottom: '10px' }}>
                <button onClick={() => handlePeriodChange('1')} style={{ marginRight: '10px' }}>1D</button>
                <button onClick={() => handlePeriodChange('7')} style={{ marginRight: '10px' }}>7D</button>
                <button onClick={() => handlePeriodChange('30')} style={{ marginRight: '10px' }}>30D</button>
                <button onClick={() => handlePeriodChange('90')} style={{ marginRight: '10px' }}>90D</button>
                <button onClick={() => handlePeriodChange('365')} style={{ marginRight: '10px' }}>1Y</button>
                <button onClick={() => handlePeriodChange('max')}>All</button>
              </div>
              {loading && <p>Loading history...</p>}
              {error && <p style={{ color: 'red' }}>{error}</p>}
              {coinHistory && (
                <div style={{ width: '600px', margin: '0 auto' }}>
                  <Line data={coinHistory} options={{
                    responsive: true,
                    plugins: { legend: { position: 'top' } },
                    scales: {
                      y: {
                        type: 'linear',
                        position: 'left',
                      },
                      y1: {
                        type: 'linear',
                        position: 'right',
                        grid: { drawOnChartArea: false },
                      }
                    }
                  }} />
                </div>
              )}
              <button onClick={() => setSelectedCoin(null)} style={{ marginTop: '20px' }}>Back to Coin List</button>
            </div>
          ) : (
              <p>Please select a coin from the Home tab to view its history.</p>
            )}
        </div>
      )}
    </div>
  );
}
export default App;