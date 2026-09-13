# Project Notes for Developers

## Project Overview

Adaptive Tutor is a React + PHP application for GatewayHacks 2026 (Equity in Education track). It diagnoses learning styles through a quiz and generates personalized explanations using the Gemini API.

## Key Technical Decisions

### Frontend
- **React with Vite**: Fast development and modern build tooling
- **pdfjs-dist**: Client-side PDF text extraction
- **No build step required for demo**: Falls back to local generation if backend fails
- **Inline styling**: No CSS framework dependency, keeps it simple

### Backend
- **PHP**: Chosen for wide hosting availability and simple deployment
- **Gemini API**: Free tier available, good for hackathon demos
- **Server-side API keys**: Never exposed to browser
- **Rate limiting**: Built-in protection against abuse

## Development Commands

### Frontend
```bash
npm install          # Install dependencies
npm run dev          # Start development server (with proxy)
npm run build        # Build for production
npm run preview      # Preview production build
```

### Backend
```bash
cd api
php -S localhost:8000  # Start PHP development server
```

## Important Constraints

1. **No emojis or decorative icons**: Use only typography, color, and layout
2. **All four card elements**: Every card must have visual map, big idea, key pieces, and analogy
3. **Four distinct styles**: Visual, verbal, example-driven, step-by-step - each with unique layout and accent color
4. **Server-side API keys**: Never expose Gemini key to browser
5. **Fallback behavior**: Frontend must work even if backend fails
6. **Typography**: Fraunces (display) + IBM Plex Sans (body)
7. **Color palette**: Strict adherence to DESIGN.md colors

## File Structure

```
adaptive-tutor/
├── src/
│   ├── App.jsx          # Main React application
│   └── main.jsx         # React entry point
├── api/
│   ├── tutor.php        # Backend endpoint with Gemini integration
│   ├── config.example.php  # API key template
│   ├── config.php       # Actual API key (gitignored)
│   ├── .htaccess        # Apache configuration
│   └── composer.json    # PHP dependencies
├── index.html           # HTML entry point with fonts
├── package.json         # Node dependencies
├── vite.config.js       # Vite configuration with API proxy
├── DESIGN.md            # Design system and visual rules
├── REQUIREMENTS.md      # Functional requirements
├── DEPLOYMENT.md        # Deployment guide
└── README.md            # Project overview
```

## Design System

### Colors
- Chalkboard green: #2B3A32 (onboarding, sidebar)
- Paper: #F1F3ED (workspace background)
- Ink: #1F2A3C (body text)
- Chalk yellow: #F2C94C (visual accent)
- Slate blue: #52708A (step-by-step accent)
- Sage green: #7A9E7E (example-driven accent)
- Brick red: #B8543E (verbal accent)

### Typography
- Fraunces: Headlines, quiz questions, topic titles
- IBM Plex Sans: Body text, buttons, UI labels

### Learning Style Layouts
- **Visual**: Visual map leads with circular markers, big idea as caption
- **Verbal**: Analogy leads as italicized pull-quote, big idea follows
- **Example-driven**: Big idea leads, worked example in shaded card, practice prompt in dashed card
- **Step-by-step**: Cards labeled "step X of Y", key pieces as plain list

## Backend API

### Endpoint
`POST /api/tutor.php`

### Request Body
```json
{
  "chunks": ["text chunk 1", "text chunk 2"],
  "style": "visual"
}
```

### Response
```json
{
  "cards": [
    {
      "bigIdea": "One clear sentence",
      "keyPieces": ["piece 1", "piece 2"],
      "analogy": "Everyday comparison"
    }
  ]
}
```

### Rate Limiting
- 20 requests per minute per IP
- Configurable in `api/tutor.php`

### Input Validation
- Max 6 chunks per request
- Max 2000 characters per chunk
- Max 10000 total characters
- Valid styles: visual, verbal, example, step

## Common Issues

### Backend Not Responding
- Check that PHP server is running on port 8000
- Verify Vite proxy configuration in `vite.config.js`
- Check browser console for CORS errors

### PDF Upload Fails
- Ensure file is under 5MB
- Verify file is valid PDF
- Check pdfjs-dist installation

### Cards Not Generating
- Check Gemini API key in `api/config.php`
- Verify API quota not exceeded
- Check browser console for error messages
- Fallback to local generation should work automatically

## Deployment Notes

### Frontend Deployment
- Can deploy to Vercel, Netlify, or any static host
- Build output goes to `dist/` directory
- Update `VITE_API_URL` environment variable for production

### Backend Deployment
- Requires PHP 7.4+ hosting
- Update CORS header before production
- Use HTTPS in production
- Monitor API usage

## Security Notes

### Dependency Vulnerabilities
- **Moderate**: esbuild <=0.24.2 has a vulnerability allowing any website to send requests to the dev server (GHSA-67mh-4wv8-2f99)
- **High**: This affects vite <=6.4.2 via dependency
- **Status**: Fix requires `npm audit fix --force` which would install vite@8.3.0 (breaking change)
- **Recommendation**: Accept risk for development; update to latest Vite before production deployment

### API Key Management
- Never commit `api/config.php` - it's in .gitignore
- Use environment variables (GEMINI_API_KEY, GEMINI_MODEL) for production deployment
- Backend validates all inputs and has rate limiting (20 req/min per IP)
- Error responses don't leak sensitive internal details

### CORS Configuration
- Currently set to `*` for local development
- **TODO**: Before production, update to specific domain in `api/tutor.php`
- Example: `header('Access-Control-Allow-Origin: https://your-app.vercel.app');`

### Environment Variables
- Frontend: `VITE_API_URL` - set to production backend URL when deployed
- Backend: `GEMINI_API_KEY`, `GEMINI_MODEL` - set via Railway/deployment platform

## Testing Checklist

- [ ] Learning style quiz completes correctly
- [ ] Profile radar chart displays properly
- [ ] Topic explanation generates cards
- [ ] PDF upload extracts text and generates cards
- [ ] Style switching changes layout and accent color
- [ ] Feedback buttons adjust profile
- [ ] Error states display appropriately
- [ ] Backend fallback works when API is down
- [ ] Rate limiting prevents abuse
- [ ] All four card elements present in every card
