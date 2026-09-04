import os
from datetime import datetime

import requests
from flask import Flask, request

app = Flask(__name__)

VERIFY_TOKEN = os.environ.get("VERIFY_TOKEN")
ACCESS_TOKEN = os.environ.get("WHATSAPP_ACCESS_TOKEN")
PHONE_NUMBER_ID = os.environ.get("PHONE_NUMBER_ID")
GRAPH_API_VERSION = os.environ.get("GRAPH_API_VERSION", "v23.0")


def send_message(recipient, message):
    url = (
        f"https://graph.facebook.com/"
        f"{GRAPH_API_VERSION}/{PHONE_NUMBER_ID}/messages"
    )

    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }

    payload = {
        "messaging_product": "whatsapp",
        "to": recipient,
        "type": "text",
        "text": {
            "body": message
        },
    }

    response = requests.post(
        url,
        headers=headers,
        json=payload,
        timeout=30,
    )

    print("WhatsApp API:", response.status_code, response.text)


def get_reply(message):
    msg = message.strip().lower()

    if msg in ("hi", "hello", "hey"):
        return (
            "👋 Hello! Welcome to *Amaglo Bot*.\n\n"
            "Type *!menu* to see what I can do."
        )

    if msg == "!menu":
        return (
            "🤖 *AMAGLO BOT*\n\n"
            "🏓 *!ping* — Check bot status\n"
            "ℹ️ *!about* — About the bot\n"
            "🕐 *!time* — Current time\n"
            "📋 *!menu* — Show this menu"
        )

    if msg == "!ping":
        return "🏓 Pong! Amaglo Bot is online."

    if msg == "!about":
        return (
            "🤖 *Amaglo Bot*\n\n"
            "A WhatsApp Cloud API bot powered by Python."
        )

    if msg == "!time":
        return (
            "🕐 Current server time:\n"
            f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        )

    return (
        "🤔 I don't understand that command.\n\n"
        "Type *!menu* to see the available commands."
    )


@app.route("/", methods=["GET"])
def home():
    return "Amaglo Bot is running 🤖", 200


@app.route("/webhook", methods=["GET"])
def verify_webhook():
    mode = request.args.get("hub.mode")
    token = request.args.get("hub.verify_token")
    challenge = request.args.get("hub.challenge")

    if mode == "subscribe" and token == VERIFY_TOKEN:
        return challenge, 200

    return "Verification failed", 403


@app.route("/webhook", methods=["POST"])
def webhook():
    data = request.get_json(silent=True) or {}

    try:
        for entry in data.get("entry", []):
            for change in entry.get("changes", []):
                value = change.get("value", {})

                for message in value.get("messages", []):
                    sender = message.get("from")
                    message_type = message.get("type")

                    if not sender:
                        continue

                    if message_type == "text":
                        text = message.get("text", {}).get("body", "")
                        reply = get_reply(text)
                        send_message(sender, reply)

    except Exception as error:
        print("Webhook error:", error)

    return "EVENT_RECEIVED", 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
