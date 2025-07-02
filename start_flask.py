#!/usr/bin/env python3
"""
Quick start script for Flask WhatsApp Server
"""

import os
import subprocess
import time
import requests

def check_environment():
    """Check if required environment variables are set."""
    required_vars = ['META_WA_TOKEN', 'OPENAI_API_KEY']
    missing = []
    
    for var in required_vars:
        if not os.getenv(var):
            missing.append(var)
    
    if missing:
        print(f"❌ Missing environment variables: {', '.join(missing)}")
        print("Please add them to Replit Secrets before starting the server.")
        return False
    
    print("✅ All required environment variables are configured")
    return True

def start_server():
    """Start the Flask server."""
    print("🚀 Starting Flask WhatsApp Server...")
    
    try:
        # Start the Flask app
        process = subprocess.Popen(['python', 'app.py'])
        
        # Wait for server to start
        print("⏳ Waiting for server to start...")
        time.sleep(5)
        
        # Test if server is running
        try:
            response = requests.get('http://localhost:3000/health', timeout=10)
            if response.status_code == 200:
                print("✅ Flask server is running successfully!")
                print("📡 Server URL: http://localhost:3000")
                print("🔗 Webhook URL: http://localhost:3000/webhook")
                print("💚 Health Check: http://localhost:3000/health")
                
                health_data = response.json()
                print(f"📞 Phone ID: {health_data.get('phone_id')}")
                print(f"🔑 Meta Token: {'✅ Configured' if health_data.get('meta_token_configured') else '❌ Missing'}")
                print(f"🤖 OpenAI: {'✅ Configured' if health_data.get('openai_configured') else '❌ Missing'}")
                
                print("\n📋 Next Steps:")
                print("1. Set your webhook URL in Meta Developers Console:")
                print("   https://developers.facebook.com/apps/your-app-id/whatsapp/getting-started/")
                print("2. Use this webhook URL: https://your-replit-url.replit.app/webhook")
                print("3. Use verify token: myverifytoken")
                print("\n⚡ Server is ready to receive WhatsApp messages!")
                
                return process
            else:
                print(f"❌ Server health check failed: {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Could not connect to server: {e}")
        
        process.terminate()
        return None
        
    except Exception as e:
        print(f"❌ Failed to start server: {e}")
        return None

if __name__ == "__main__":
    print("🔥 Flask WhatsApp Business API Server")
    print("=" * 40)
    
    if check_environment():
        server_process = start_server()
        
        if server_process:
            try:
                # Keep the script running
                print("\n💡 Press Ctrl+C to stop the server")
                server_process.wait()
            except KeyboardInterrupt:
                print("\n🛑 Stopping server...")
                server_process.terminate()
                print("✅ Server stopped")
        else:
            print("❌ Failed to start server")
    else:
        print("❌ Environment not properly configured")