<?php
// Copy this file to config.php and fill in your real values.
// config.php is gitignored and must never be committed.
// On Render, set these as environment variables instead:
//   GEMINI_API_KEY, GEMINI_MODEL, ALLOWED_ORIGINS

return [
    'gemini_api_key'  => 'YOUR_GEMINI_API_KEY_HERE',
    // Use a current Gemini Flash model name from ai.google.dev.
    'gemini_model'    => 'gemini-3.6-flash',
    // Comma-separated list of frontend URLs allowed to call this API.
    'allowed_origins' => 'http://localhost:5173,https://ai-tutor-rho-one.vercel.app',
];
