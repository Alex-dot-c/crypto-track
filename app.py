from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_caching import Cache
import requests
import os
import time

app = Flask(__name__)
CORS(app)
cache = Cache(config={'CACHE_TYPE': 'SimpleCache'})
cache.init_app(app)


@app.route("/api/coins")
@cache.cached(timeout=300)
def get_coins():
    try:
        url = "https://api.coingecko.com/api/v3/coins/markets"
        params={
                "vs_currency": "usd",
                "order": "market_cap_desc",
                "per_page": 10,
                "page": 1,
            }
        response = requests.get(
            url,
            params=params,
            timeout=10
        )
        app.logger.info(f"API status code: {response.status_code}")
        app.logger.info(f"API Response: {response.text[:200]}")
        if response.status_code ==429:
            app.logger.warning("Rate limit hit. Retrying after 60s...")
            time.sleep(60)
            response = requests.get(url,params=params, timeout=10)
            if response.status_code != 200:
                app.logger.error(f"Retry failed with status: {response.status_code}")
                return jsonify({"error": "CoinGecko API failed (retry)", "status": response.status_code}), response.status_code
        if response.status_code != 200:
            return (
                jsonify(
                    {"error": "CoinGecko API failed", "status": response.status_code}
                ),
                500,
            )
        return jsonify(response.json())
    except Exception as e:
        print(f"Error in /api/coins: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/coin/<id>/history")
def get_coin_history(id):
    try:
        id_map = {"btc": "bitcoin", "eth": "ethereum", "xrp": "ripple"}
        coin_id = id_map.get(id.lower(), id)
        days = int(request.args.get("days", "30"))
        url = f"https://api.coingecko.com/api/v3/coins/{id}/market_chart"
         params={
                "vs_currency": "usd",
                "days": days,
                "interval": "daily",
            }
        response = requests.get(
            url, params=params,
            timeout=10
        )
        app.logger.info(f"History API status code: {response.status_code}")
        app.logger.info(f"History API Response: {response.text[:200]}")
        if response.status_code ==429:
            app.logger.warning("Rate limit hit. Retrying after 60s...")
            time.sleep(60)
            response = requests.get(url,params=params, timeout=10)
            if response.status_code != 200:
                app.logger.error(f"Retry failed with status: {response.status_code}")
                return jsonify({"error": "CoinGecko History API failed (retry)", "status": response.status_code}), response.status_code
        if response.status_code != 200:
            return (
                jsonify(
                    {
                        "error": "CoinGecko History API failed",
                        "status": response.status_code,
                    }
                ),
                500,
            )
        data = response.json()
        return jsonify(data)
    except ValueError:
        return jsonify({"error": "Invalid 'days' parameter"}), 400
    except Exception as e:
        app.logger.error(f"Error in /api/coin/{id}/history: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/grok", methods=["POST"])
def grok_news_and_chart():

    data = request.get_json()
    prompt = data.get("prompt", "")
    if not prompt:
        return jsonify({"error": "No prompt provided"}), 400

    # 1. Call Grok API:
    GROK_API_URL = os.environ.get(
        "GROK_API_URL", "https://api.x.ai/v1/chat/completions"
    )  # Placeholder
    GROK_API_KEY = os.environ.get("GROK_API_KEY")

    ai_response = "No AI response"
    try:
        headers = {
            "Authorization": f"Bearer {GROK_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": "grok-beta",
            "messages": [
                {
                    "role": "user",
                    "content": f"Give me the latest news and summary for: {prompt}",
                }
            ],
            "temperature": 0.7,
            "max_tokens": 512,
        }
        grok = requests.post(GROK_API_URL, headers=headers, json=payload, timeout=15)
        if grok.status_code == 200:
            resp = grok.json()
            ai_response = (
                resp.get("choices", [{}])[0]
                .get("message", {})
                .get("content", "No answer")
            )
        else:
            ai_response = f"Grok API error: {grok.status_code}"
    except Exception as e:
        ai_response = f"Error calling Grok: {str(e)}"

    # 2. Match prompt to a coin and fetch chart
    coins_url = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1"
    coins_resp = requests.get(coins_url, timeout=10)
    chart = None
    coin = None
    if coins_resp.status_code == 200:
        coins = coins_resp.json()
        prompt_lower = prompt.strip().lower()
        for c in coins:
            if c["symbol"].lower() == prompt_lower or c["name"].lower() == prompt_lower:
                coin = c
                coin_id = c["id"]
                break
        if coin:
            chart_url = f"https://api.coingecko.com/api/v3/coins/{coin_id}/market_chart"
            chart_resp = requests.get(
                chart_url, params={"vs_currency": "usd", "days": "30"},
                timeout=10
            )
            if chart_resp.status_code == 200:
                chart = chart_resp.json()
    else:
        app.logger.error(f"CoinGecko markets failed: {coins_resp.status_code}")
    return jsonify(
        {
            "ai": ai_response,
            "coin": coin,
            "chart": chart,
        }
    )


@app.route("/")
def index():
    print("Accessed the root endpoint")
    return "Welcome to the Crypto Tracker API! Use /api/coins to get the top 10 cryptocurrencies by market cap."


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=False)
