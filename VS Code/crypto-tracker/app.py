from flask import Flask, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

@app.route('/api/coins')
def get_coins():
    try:
        url = 'https://api.coingecko.com/api/v3/coins/markets'
        response = requests.get(url, params={'vs_currency': 'usd', 'order': 'market_cap_desc', 'per_page': 10, 'page': 1})
        print(f"API status code: {response.status_code}")
        if response.status_code != 200:
                return jsonify({"error": "CoinGecko API failed", "status": response.status_code}), 500
        return jsonify(response.json())
    except Exception as e:
         print(f"Error in /api/coins: {str(e)}")
         return jsonify({"error": str(e)}),500

@app.route('/')
def index():
    print("Accessed the root endpoint")
    return "Welcome to the Crypto Tracker API! Use /api/coins to get the top 10 cryptocurrencies by market cap."

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5001)

