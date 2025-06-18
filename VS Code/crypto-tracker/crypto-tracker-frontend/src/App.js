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


  useEffect(() => {
    setLoading(true);
    axios
      .get('http://localhost:5001/api/coins')
      .then((response) => {
        setCoins(response.data);
        const bitcoin = response.data.find(coin => coin.id === 'bitcoin');
        if (bitcoin){
          setChartData({
            labels: ['1h','2h','6h','12h','24h'],
            datasets: [{
              label: 'Bitcoin Price in (USD)',
              data: [bitcoin.current_price * 0.98, bitcoin.current_price * 0.99, bitcoin.current_price, bitcoin.current_price * 1.01, bitcoin.current_price * 1.02], // Mock prices
              borderColor: 'rgba(75,192,192,1)',
              tension: 0.1
            }]
          })
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching coins:', error);
        setError('Failed to load coin data');
        setLoading(false);
      });
  }, []);

  return (
    <div className="App">
      <h1>Crypto Market Tracker</h1>
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