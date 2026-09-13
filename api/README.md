# API Backend

This directory contains the PHP backend for the Adaptive Tutor application.

## Setup

1. Copy `config.example.php` to `config.php`:
   ```bash
   cp config.example.php config.php
   ```

2. Edit `config.php` and add your Gemini API key:
   ```php
   return [
       'gemini_api_key' => 'YOUR_GEMINI_API_KEY_HERE',
       'gemini_model'   => 'gemini-2.0-flash',
   ];
   ```

3. Run the PHP server locally:
   ```bash
   php -S localhost:8000
   ```

## Security Features

- **Rate limiting**: 20 requests per minute per IP
- **Input validation**: Validates chunk size, content, and style parameters
- **CORS protection**: Configurable origin whitelist (update before production)
- **API key security**: Keys are stored server-side, never exposed to clients

## Production Deployment

Before deploying to production:

1. Update the CORS header in `tutor.php` from `*` to your actual frontend domain
2. Ensure your hosting environment supports PHP 7.4+
3. Configure the `.htaccess` file for your web server
4. Use HTTPS to protect API keys and user data
5. Monitor API usage to stay within Gemini free tier limits

See the main `DEPLOYMENT.md` file for detailed deployment instructions.

## Testing

Test the endpoint locally:
```bash
curl -X POST http://localhost:8000/tutor.php \
  -H "Content-Type: application/json" \
  -d '{"chunks":["test chunk"],"style":"visual"}'
```
