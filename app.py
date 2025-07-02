import os
import json
import requests
from flask import Flask, request, jsonify
from openai import OpenAI

app = Flask(__name__)

# Environment variables from Replit Secrets
META_WA_TOKEN = os.getenv('META_WA_TOKEN')
META_PHONE_ID = '241066742425749'  # Your specified phone ID
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
VERIFY_TOKEN = 'myverifytoken'  # Your specified verify token

# Initialize OpenAI client
client = OpenAI(api_key=OPENAI_API_KEY)

def ask_gpt(prompt):
    """Call ChatGPT API and return the reply text."""
    try:
        print(f"[GPT REQUEST] Sending prompt: {prompt}")
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=150,
            temperature=0.7
        )
        
        reply = response.choices[0].message.content
        if reply:
            reply = reply.strip()
        else:
            reply = "Sorry, I couldn't generate a response."
        print(f"[GPT RESPONSE] Received reply: {reply}")
        return reply
        
    except Exception as e:
        print(f"[GPT ERROR] Failed to get response: {str(e)}")
        return "Sorry, I'm having trouble processing your request right now. Please try again later."

def send_whatsapp_message(to, text):
    """Send a message to WhatsApp user via Meta's WhatsApp Cloud API."""
    try:
        url = f"https://graph.facebook.com/v18.0/{META_PHONE_ID}/messages"
        
        headers = {
            "Authorization": f"Bearer {META_WA_TOKEN}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "text",
            "text": {"body": text}
        }
        
        print(f"[WHATSAPP SEND] Sending to {to}: {text}")
        
        response = requests.post(url, headers=headers, json=payload)
        
        print(f"[WHATSAPP RESPONSE] Status: {response.status_code}, Response: {response.text}")
        
        if response.status_code == 200:
            return True
        else:
            print(f"[WHATSAPP ERROR] Failed to send message: {response.text}")
            return False
            
    except Exception as e:
        print(f"[WHATSAPP ERROR] Exception occurred: {str(e)}")
        return False

@app.route('/webhook', methods=['GET', 'POST'])
def webhook():
    if request.method == 'GET':
        # Webhook verification
        mode = request.args.get('hub.mode')
        token = request.args.get('hub.verify_token')
        challenge = request.args.get('hub.challenge')
        
        print(f"[WEBHOOK VERIFY] Mode: {mode}, Token: {token}")
        
        if mode == 'subscribe' and token == VERIFY_TOKEN:
            print(f"[WEBHOOK VERIFY] Verification successful, returning challenge: {challenge}")
            return challenge
        else:
            print(f"[WEBHOOK VERIFY] Verification failed")
            return 'Forbidden', 403
    
    elif request.method == 'POST':
        # Handle incoming WhatsApp messages
        try:
            data = request.get_json()
            print(f"[WEBHOOK POST] Received data: {json.dumps(data, indent=2)}")
            
            # Extract message data from WhatsApp webhook payload
            if 'entry' in data and len(data['entry']) > 0:
                entry = data['entry'][0]
                
                if 'changes' in entry and len(entry['changes']) > 0:
                    change = entry['changes'][0]
                    
                    if 'value' in change and 'messages' in change['value']:
                        messages = change['value']['messages']
                        
                        for message in messages:
                            # Extract sender's WhatsApp number
                            sender = message.get('from')
                            
                            # Extract message text body
                            if message.get('type') == 'text' and 'text' in message:
                                message_text = message['text']['body']
                                
                                print(f"[INCOMING MESSAGE] From: {sender}, Text: {message_text}")
                                
                                # Call GPT with the message text
                                gpt_reply = ask_gpt(message_text)
                                
                                # Send reply back to user
                                if send_whatsapp_message(sender, gpt_reply):
                                    print(f"[SUCCESS] Message sent successfully to {sender}")
                                else:
                                    print(f"[ERROR] Failed to send message to {sender}")
            
            return jsonify({"status": "success"}), 200
            
        except Exception as e:
            print(f"[WEBHOOK ERROR] Exception processing webhook: {str(e)}")
            return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({
        "status": "healthy",
        "meta_token_configured": bool(META_WA_TOKEN),
        "openai_configured": bool(OPENAI_API_KEY),
        "phone_id": META_PHONE_ID
    })

@app.route('/test-send', methods=['POST'])
def test_send():
    """Test endpoint to send a message manually."""
    try:
        data = request.get_json()
        to = data.get('to')
        message = data.get('message')
        
        if not to or not message:
            return jsonify({"error": "Both 'to' and 'message' are required"}), 400
        
        success = send_whatsapp_message(to, message)
        
        return jsonify({
            "success": success,
            "message": "Message sent successfully" if success else "Failed to send message"
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("[FLASK APP] Starting WhatsApp Flask server...")
    print(f"[CONFIG] Phone ID: {META_PHONE_ID}")
    print(f"[CONFIG] Meta Token configured: {bool(META_WA_TOKEN)}")
    print(f"[CONFIG] OpenAI configured: {bool(OPENAI_API_KEY)}")
    print(f"[CONFIG] Verify Token: {VERIFY_TOKEN}")
    
    # Use port 3000 for Replit public access (avoiding Node.js port 5000)
    port = int(os.getenv('PORT', 3000))
    app.run(host='0.0.0.0', port=port, debug=False)