# Deployment Guide

This guide covers deploying the Adaptive Tutor application for production.

## Architecture Overview

The application consists of two parts:
1. **Frontend**: React (Vite) application - deploy to Vercel, Netlify, or any static host
2. **Backend**: PHP API endpoint - deploy to any PHP-capable hosting service

## Backend Deployment (PHP)

### Step 1: Prepare the Backend

1. Copy the `api/config.example.php` to `api/config.php`
2. Add your Gemini API key to `config.php`
3. Update the CORS header in `api/tutor.php` from `*` to your actual frontend domain

```php
header('Access-Control-Allow-Origin: https://your-frontend-domain.com');
```

### Step 2: Choose a PHP Hosting Provider

Recommended options for PHP hosting:
- **Heroku** (with PHP buildpack)
- **Render** (supports PHP)
- **Railway** (supports PHP)
- **Traditional shared hosting** (cPanel, etc.)
- **VPS** (DigitalOcean, Linode, etc.)

### Step 3: Deploy the Backend

#### Option A: Heroku Deployment

1. Install Heroku CLI and login
2. Create a new Heroku app:
   ```bash
   heroku create your-app-name
   ```
3. Set environment variables:
   ```bash
   heroku config:set GEMINI_API_KEY=your_api_key_here
   heroku config:set GEMINI_MODEL=gemini-2.0-flash
   ```
4. Create a `composer.json` in the api directory:
   ```json
   {
     "require": {
       "php": ">=7.4"
     }
   }
   ```
5. Deploy:
   ```bash
   git push heroku main
   ```

#### Option B: Traditional Shared Hosting

1. Upload the `api/` directory to your hosting provider's public folder
2. Ensure PHP 7.4+ is available
3. Set proper file permissions (755 for directories, 644 for files)
4. Configure the `.htaccess` file if using Apache
5. Update `api/config.php` with your API key

#### Option C: VPS Deployment

1. Install PHP and required extensions:
   ```bash
   sudo apt update
   sudo apt install php php-curl php-json
   ```
2. Configure your web server (Apache/Nginx)
3. Upload the `api/` directory to your web root
4. Set up SSL certificate (Let's Encrypt recommended)
5. Configure the provided `.htaccess` or Nginx config

### Step 4: Test the Backend

Test your deployed backend:
```bash
curl -X POST https://your-backend-url.com/api/tutor.php \
  -H "Content-Type: application/json" \
  -d '{"chunks":["test chunk"],"style":"visual"}'
```

## Frontend Deployment (React/Vite)

### Step 1: Update Backend URL

Before building, update the backend URL in your frontend code.

**For local development**: The Vite proxy in `vite.config.js` handles this automatically.

**For production**: You have two options:

#### Option A: Use Environment Variables
1. Create `.env.production`:
   ```
   VITE_API_URL=https://your-backend-url.com
   ```
2. Update `src/App.jsx` to use the environment variable:
   ```javascript
   const response = await fetch(`${import.meta.env.VITE_API_URL}/api/tutor.php`, {
   ```
3. Update the Vite config to remove the proxy for production builds.

#### Option B: Hardcode the Production URL
Update the fetch URL in `src/App.jsx` directly:
```javascript
const response = await fetch("https://your-backend-url.com/api/tutor.php", {
```

### Step 2: Deploy to Vercel

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```
2. Login to Vercel:
   ```bash
   vercel login
   ```
3. Deploy:
   ```bash
   vercel
   ```
4. Follow the prompts to configure your project

### Step 3: Deploy to Netlify

1. Install Netlify CLI:
   ```bash
   npm i -g netlify-cli
   ```
2. Login to Netlify:
   ```bash
   netlify login
   ```
3. Initialize and deploy:
   ```bash
   netlify init
   netlify deploy --prod
   ```

### Step 4: Deploy to GitHub Pages

1. Update `vite.config.js` to set the correct base path:
   ```javascript
   export default defineConfig({
     base: '/your-repo-name/',
     // ... rest of config
   })
   ```
2. Build the project:
   ```bash
   npm run build
   ```
3. Deploy the `dist/` folder to GitHub Pages

## Important Security Notes

1. **CORS Configuration**: Before going live, update the CORS header in `api/tutor.php` from `*` to your specific frontend domain.

2. **API Key Security**: Never commit `api/config.php` to version control. It's already in `.gitignore`.

3. **Rate Limiting**: The backend includes rate limiting (20 requests per minute per IP). Adjust these values in `api/tutor.php` based on your needs.

4. **SSL/TLS**: Always use HTTPS in production to protect API keys and user data.

5. **Input Validation**: The backend includes input validation and size limits. Monitor these in production.

## Testing the Deployed Application

1. Test the learning style quiz
2. Test topic explanation with the backend connected
3. Test PDF upload functionality
4. Test style switching in the sidebar
5. Test the feedback buttons ("This clicked" / "Still confusing")
6. Test error handling (try invalid files, network issues, etc.)

## Troubleshooting

### Backend Issues

- **500 errors**: Check PHP error logs, ensure `config.php` exists and is properly formatted
- **CORS errors**: Verify the CORS header matches your frontend domain exactly
- **Rate limiting**: If you see 429 errors, wait before making more requests or adjust limits

### Frontend Issues

- **Build failures**: Ensure all dependencies are installed (`npm install`)
- **API connection errors**: Verify the backend URL is correct and accessible
- **PDF upload issues**: Check file size limits and ensure PDF.js is properly loaded

### Performance Considerations

- The frontend includes a fallback to local card generation if the backend fails
- Consider implementing caching for frequently requested topics
- Monitor Gemini API usage to stay within free tier limits

## Maintenance

- Regularly update dependencies (`npm update`)
- Monitor backend logs for unusual activity
- Keep your Gemini API key secure and rotate if compromised
- Update CORS configuration if you change frontend domains
