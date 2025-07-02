#!/usr/bin/env python3
"""
Interactive WhatsApp Flask Server Tester
"""

import requests
import json
import time
import subprocess

def test_flask_server():
    print("🧪 WhatsApp Flask Server Interactive Tester")
    print("=" * 50)
    
    # Start server
    print("Starting Flask server...")
    proc = subprocess.Popen(['python', 'app.py'], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    time.sleep(4)
    
    try:
        # Test health
        print("\n1. Testing Health Check...")
        health = requests.get('http://localhost:3000/health', timeout=10)
        print(f"Status: {health.status_code}")
        print(f"Response: {json.dumps(health.json(), indent=2)}")
        
        # Test webhook verification
        print("\n2. Testing Webhook Verification...")
        webhook_verify = requests.get('http://localhost:3000/webhook?hub.mode=subscribe&hub.verify_token=myverifytoken&hub.challenge=abc123')
        print(f"Status: {webhook_verify.status_code}")
        print(f"Challenge Response: {webhook_verify.text}")
        
        # Test message processing
        print("\n3. Testing Message Processing...")
        test_message = {
            "entry": [{
                "changes": [{
                    "value": {
                        "messages": [{
                            "from": "+1234567890",
                            "type": "text",
                            "text": {"body": "Hello! What is the weather like today?"}
                        }]
                    }
                }]
            }]
        }
        
        webhook_post = requests.post('http://localhost:3000/webhook', 
                                   json=test_message,
                                   headers={'Content-Type': 'application/json'},
                                   timeout=20)
        print(f"Status: {webhook_post.status_code}")
        print(f"Response: {webhook_post.json()}")
        
        print("\n✅ All tests completed successfully!")
        print("\n📋 Next Steps:")
        print("1. Deploy your Replit app to get a public URL")
        print("2. Configure Meta WhatsApp webhook with your URL")
        print("3. Start receiving real WhatsApp messages!")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
    
    finally:
        proc.terminate()
        proc.wait()

if __name__ == "__main__":
    test_flask_server()