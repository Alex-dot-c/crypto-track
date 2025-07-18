import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import './App.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

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




  useEffect(() => {
    setLoading(true);
    axios
      .get(`${API_URL}/api/coins`)
      .then((response) => {
        setCoins(response.data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching coins:', error);
        setError('Failed to load coin data');
        setLoading(false);
      });
  }, []);

  const handleSymbolClick = (coin) => {
    setSelectedCoin(coin);
    setError(null);
    setCoinHistory(null);
    setLoading(true);
    axios
      .get(`${API_URL}/api/coin/${coin.id}/history`)
      .then((chartResponse) => {
        const prices = chartResponse.data.prices.map(price => price[1]);
        const labels = chartResponse.data.prices.map(price => new Date(price[0]).toLocaleDateString());
        setCoinHistory({
          labels: labels,
          datasets: [{
            label: `${coin.name} Price (USD) - Last 30 days`,
            data: prices,
            borderColor: 'rgba(75,192,192,1)',
            tension: 0.1
          }]
        });
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching coin history:', error);
        setError('Failed to load coin history');
        setLoading(false);
      });
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
        const labels = res.data.chart.prices.map(price => new Date(price[0]).toLocaleDateString());
        setCoinHistory({
          labels: labels,
          datasets: [{
            label: `${res.data.coin.name} Price (USD) - Last 30 days`,
            data: prices,
            borderColor: 'rgba(75,192,192,1)',
            tension: 0.1
          }]
        });
      }
      setPrompt('');
    } catch (err) {
      setAIResponse('Error communicating with AI');
    }
    setAILoading(false);
  };

  return (
    <div className="App">
      <h1>Crypto Market Tracker</h1>
      {/*AI assistant prompt section */}
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
      </div>




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
        <>
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
                    onClick={() => handleSymbolClick(coin)}
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
          {selectedCoin && coinHistory && (
            <div style={{ width: '600px', margin: '20px auto' }}>
              <h2>{selectedCoin.name} Price History (30 Days)</h2>
              <Line data={coinHistory} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;