import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import './App.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

function App() {
  const [coins, setCoins] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState(null);
  const [search, setSearch] = useState('');


  useEffect(() => {
    setLoading(true);
    axios
      .get('https://crypto-tracker-backend-4xaw.onrender.com/api/coins')
      .then((response) => {
        setCoins(response.data);
        const bitcoin = response.data.find(coin => coin.id === 'bitcoin');
        if (bitcoin){
          axios
            .get(`https://api.coingecko.com/api/v3/coins/${bitcoin.id}/market_chart?vs_currency=usd&days=1`)
            .then((chartResponse) => {
              const prices = chartResponse.data.prices.map(price => price[1]);
              const labels = chartResponse.data.prices.map(price => new Date(price[0]).toLocaleTimeString());
              setChartData({
                labels: labels,
                datasets: [{
                  label: 'Bitcoin Price (USD)',
                  data: prices,
                  borderColor: 'rgba(75,192,192,1)',
                  tension: 0.1
                }]
              });
              setLoading(false);
            })
            .catch((error) => {
              console.error('Error fetching Bitcoin chart data:', error);
              setError('Failed to load Bitcoin chart data');
              setLoading(false);
            });
        }else{
          setError('Bitcoin data not found');
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error('Error fetching coins:', error);
        setError('Failed to load coin data');
        setLoading(false);
      });
  }, []);

  const filteredCoins = coins.filter(coin =>
    coin.name.toLowerCase().includes(search.toLowerCase()) ||
    coin.symbol.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="App">
      <h1>Crypto Market Tracker</h1>
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
              {coins.map((coin) => (
                <tr key={coin.id}>
                  <td>{coin.name}</td>
                  <td>{coin.symbol.toUpperCase()}</td>
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
          {chartData && (
            <div style={{ width: '600px', margin: '20px auto' }}>
              <Line data={chartData} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;