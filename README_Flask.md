# Flask WhatsApp Business Cloud API Server

A Flask-based server for integrating WhatsApp Business Cloud API with OpenAI ChatGPT to create an AI-powered WhatsApp chatbot.

## Features

- ✅ WhatsApp Business Cloud API webhook handling
- ✅ OpenAI ChatGPT integration (gpt-3.5-turbo)
- ✅ Automatic message processing and responses
- ✅ Webhook verification for Meta
- ✅ Health check endpoint
- ✅ Test messaging endpoint
- ✅ Comprehensive logging

## Setup

### 1. Dependencies Installed
```bash
flask==3.1.1
requests==2.32.4
openai==1.93.0
```

### 2. Environment Variables (Already Configured)
- `META_WA_TOKEN` - Your WhatsApp Business API access token ✅
- `OPENAI_API_KEY` - Your OpenAI API key ✅
- `META_PHONE_ID` - Set to `241066742425749` (hardcoded as requested)

### 3. Configuration
- **Webhook Verify Token**: `myverifytoken`
- **Server Port**: `3000`
- **Server Host**: `0.0.0.0` (accessible from outside)

## API Endpoints

### Webhook Endpoint
- **URL**: `/webhook`
- **Methods**: `GET`, `POST`

#### GET (Webhook Verification)
```
GET /webhook?hub.mode=subscribe&hub.verify_token=myverifytoken&hub.challenge=CHALLENGE
```
Returns the challenge value if verification succeeds.

#### POST (Incoming Messages)
Receives WhatsApp messages and automatically:
1. Extracts sender's phone number and message text
2. Sends text to ChatGPT for AI response
3. Sends AI reply back to user via WhatsApp

### Health Check
- **URL**: `/health`
- **Method**: `GET`
- **Response**: Server status and configuration check

### Test Endpoint
- **URL**: `/test-send`
- **Method**: `POST`
- **Body**:
```json
{
  "to": "+1234567890",
  "message": "Test message"
}
```

## Running the Server

### Option 1: Direct Python
```bash
python app.py
```

### Option 2: Using Start Script
```bash
python start_flask.py
```

### Server Output
```
[FLASK APP] Starting WhatsApp Flask server...
[CONFIG] Phone ID: 241066742425749
[CONFIG] Meta Token configured: True
[CONFIG] OpenAI configured: True
[CONFIG] Verify Token: myverifytoken
* Running on http://0.0.0.0:3000
```

## WhatsApp Business API Setup

### 1. Meta Developers Console
1. Go to [Meta for Developers](https://developers.facebook.com)
2. Navigate to your WhatsApp Business app
3. Go to WhatsApp > Getting Started

### 2. Configure Webhook
1. Set Webhook URL: `https://your-replit-url.replit.app/webhook`
2. Set Verify Token: `myverifytoken`
3. Subscribe to message events

### 3. Test Configuration
```bash
curl "http://localhost:3000/webhook?hub.mode=subscribe&hub.verify_token=myverifytoken&hub.challenge=test123"
# Should return: test123
```

## Message Flow

1. **User sends WhatsApp message** → Meta WhatsApp Cloud API
2. **Meta forwards message** → Your Flask webhook (`/webhook`)
3. **Flask extracts text** → Sends to OpenAI ChatGPT
4. **ChatGPT generates response** → Returns to Flask
5. **Flask sends reply** → WhatsApp Cloud API → User

## Logging

The server provides detailed logging for:
- `[INCOMING MESSAGE]` - Received WhatsApp messages
- `[GPT REQUEST]` - Messages sent to ChatGPT
- `[GPT RESPONSE]` - AI-generated replies
- `[WHATSAPP SEND]` - Messages sent to WhatsApp
- `[WHATSAPP RESPONSE]` - WhatsApp API responses

## Testing

### Health Check
```bash
curl http://localhost:3000/health
```

### Webhook Verification
```bash
curl "http://localhost:3000/webhook?hub.mode=subscribe&hub.verify_token=myverifytoken&hub.challenge=test123"
```

### Manual Message Send
```bash
curl -X POST http://localhost:3000/test-send \
  -H "Content-Type: application/json" \
  -d '{"to": "+1234567890", "message": "Hello from Flask!"}'
```

## Security Notes

- Environment variables are used for sensitive tokens
- Webhook verification prevents unauthorized access
- HTTPS recommended for production deployment

## Production Considerations

- Use a production WSGI server (e.g., Gunicorn)
- Enable HTTPS/SSL
- Add rate limiting
- Implement message queuing for high volume
- Add database for conversation history
- Monitor API quotas and usage

## Troubleshooting

### Common Issues
1. **Connection refused**: Check if server is running on port 3000
2. **Webhook verification fails**: Verify token must be exactly `myverifytoken`
3. **Messages not sending**: Check META_WA_TOKEN and phone number format
4. **ChatGPT errors**: Verify OPENAI_API_KEY is valid

### Debug Mode
The Flask server runs in debug mode with automatic reloading enabled.

## Files

- `app.py` - Main Flask application
- `start_flask.py` - Quick start script with validation
- `README_Flask.md` - This documentation

Your Flask WhatsApp Business API server is ready to receive and respond to WhatsApp messages with AI-powered responses!