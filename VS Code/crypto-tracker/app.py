from flask import Flask, jsonify
from flask_cors import CORS
import requests
import os

app = Flask(__name__)
CORS(app)

@app.route('/api/coins')
def get_coins():
    try:
        url = 'https://api.coingecko.com/api/v3/coins/markets'
        response = requests.get(url, params={'vs_currency': 'usd', 'order': 'market_cap_desc', 'per_page': 10, 'page': 1})
        print(f"API status code: {response.status_code}")
        print(f"API Response: {response.text[:200]}")
        if response.status_code != 200:
                return jsonify({"error": "CoinGecko API failed", "status": response.status_code}), 500
        return jsonify(response.json())
    except Exception as e:
         print(f"Error in /api/coins: {str(e)}")
         return jsonify({"error": str(e)}),500
    
@app.route('/api/coin/<id>/history')
def get_coin_history(id):
    try:
        url = f'https://api.coingecko.com/api/v3/coins/{id}/market_chart'
        response = requests.get(url, params={'vs_currency': 'usd', 'days': '30'})
        print(f"History API status code: {response.status_code}")
        print(f"History API Response: {response.text[:200]}")
        if response.status_code != 200:
            return jsonify({"error": "CoinGecko History API failed", "status": response.status_code}), 500
        return jsonify(response.json())
    except Exception as e:
         print(f"Error in /api/coin/{id}/history: {str(e)}")
         return jsonify({"error": str(e)}),500

@app.route('/')
def index():
    print("Accessed the root endpoint")
    return "Welcome to the Crypto Tracker API! Use /api/coins to get the top 10 cryptocurrencies by market cap."

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False)

