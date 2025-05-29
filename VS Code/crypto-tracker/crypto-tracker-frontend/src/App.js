import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [coins, setCoins] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    axios
      .get('http://localhost:5001/api/coins')
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

  return (
    <div className="App">
      <h1>Crypto Market Tracker</h1>
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
            {coins.map((coin) => (
              <tr key={coin.id}>
                <td>{coin.name}</td>
                <td>{coin.symbol.toUpperCase()}</td>
                <td>${coin.current_price.toFixed(2)}</td>
                <td
                  style={{
                    color:
                      coin.price_change_percentage_24h >= 0 ? 'green' : 'red',
                  }}
                >
                  {coin.price_change_percentage_24h.toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default App;