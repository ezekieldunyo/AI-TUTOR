<?php
// api/tutor.php
//
// Receives a list of text chunks plus a learning style, asks Gemini to turn
// each chunk into a big idea, key pieces, and an analogy, and returns them
// as JSON in the same order they were sent.
//
// Setup: copy config.example.php to config.php and add your Gemini key.

session_start();

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); 
// TODO: Before production deployment, replace '*' with your actual frontend domain
// Example: header('Access-Control-Allow-Origin: https://your-app.vercel.app');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Use POST']);
    exit;
}

// Rate limiting: allow max 20 requests per minute per IP
$rateLimitKey = 'rate_limit_' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
$currentTime = time();
$rateWindow = 60; // 60 seconds
$maxRequests = 20;

if (!isset($_SESSION[$rateLimitKey])) {
    $_SESSION[$rateLimitKey] = ['count' => 0, 'window_start' => $currentTime];
}

$rateData = $_SESSION[$rateLimitKey];

// Reset window if expired
if ($currentTime - $rateData['window_start'] > $rateWindow) {
    $_SESSION[$rateLimitKey] = ['count' => 1, 'window_start' => $currentTime];
} else {
    $_SESSION[$rateLimitKey]['count']++;
    
    if ($_SESSION[$rateLimitKey]['count'] > $maxRequests) {
        http_response_code(429);
        echo json_encode(['error' => 'Rate limit exceeded. Please wait before making more requests.']);
        exit;
    }
}

// Try environment variables first (for Railway/deployment), fall back to config.php
$apiKey = getenv('GEMINI_API_KEY');
$model = getenv('GEMINI_MODEL');

if ($apiKey && $model) {
    $config = ['gemini_api_key' => $apiKey, 'gemini_model' => $model];
} else {
    $configPath = __DIR__ . '/config.php';
    if (!file_exists($configPath)) {
        http_response_code(500);
        echo json_encode(['error' => 'Server configuration error. Contact administrator.']);
        exit;
    }
    $config = require $configPath;
}

$input = json_decode(file_get_contents('php://input'), true);
$chunks = $input['chunks'] ?? null;
$style = $input['style'] ?? 'visual';

// Validate style parameter
$validStyles = ['visual', 'verbal', 'example', 'step'];
if (!in_array($style, $validStyles)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid style. Must be one of: visual, verbal, example, step']);
    exit;
}

if (!is_array($chunks) || count($chunks) === 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Send { "chunks": ["..."], "style": "visual" }']);
    exit;
}

// Validate chunk content
$totalChars = 0;
foreach ($chunks as $chunk) {
    if (!is_string($chunk)) {
        http_response_code(400);
        echo json_encode(['error' => 'All chunks must be strings']);
        exit;
    }
    $chunkLength = mb_strlen(trim($chunk));
    if ($chunkLength === 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Chunks cannot be empty']);
        exit;
    }
    if ($chunkLength > 2000) {
        http_response_code(400);
        echo json_encode(['error' => 'Each chunk must be less than 2000 characters']);
        exit;
    }
    $totalChars += $chunkLength;
}

// Limit total input size to prevent abuse
if ($totalChars > 10000) {
    http_response_code(400);
    echo json_encode(['error' => 'Total input text too large. Please break into smaller chunks.']);
    exit;
}

// Cap how much we ask for in one request, both for cost and for reliability.
$chunks = array_slice($chunks, 0, 6);

$styleGuidance = [
    'visual'  => 'Favor concrete, spatial language that could be sketched as a simple diagram.',
    'verbal'  => 'Favor a strong, relatable analogy and narrative phrasing.',
    'example' => 'Favor a concrete worked example over abstract description.',
    'step'    => 'Favor a strict, ordered sequence of actions.',
][$style] ?? 'Keep the explanation clear and concrete.';

$prompt = "You are helping build a study tool. For each numbered passage below, "
    . "produce a JSON object with exactly these fields: "
    . "\"bigIdea\" (one clear sentence, plain language), "
    . "\"keyPieces\" (an array of 2 to 4 short strings breaking the idea into pieces), "
    . "\"analogy\" (one relatable, everyday comparison, one to two sentences), "
    . "\"example\" (a concrete, specific worked example showing the idea applied to one real case with actual details — not another abstract restatement of the big idea. Two to three sentences). "
    . "{$styleGuidance} "
    . "Return ONLY a JSON array of these objects, in the same order as the passages, "
    . "with no surrounding text or markdown fences.\n\n";

foreach ($chunks as $i => $chunk) {
    $prompt .= ($i + 1) . ". " . trim($chunk) . "\n\n";
}

$apiKey = $config['gemini_api_key'];
$model = $config['gemini_model'];
$url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}";

$body = [
    'contents' => [[
        'parts' => [['text' => $prompt]],
    ]],
    'generationConfig' => [
        'temperature' => 0.4,
    ],
];

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode($body),
    CURLOPT_TIMEOUT => 25,
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    http_response_code(502);
    echo json_encode(['error' => 'Could not reach Gemini API']);
    exit;
}

$data = json_decode($response, true);

if ($httpCode !== 200 || !isset($data['candidates'][0]['content']['parts'][0]['text'])) {
    http_response_code(502);
    echo json_encode(['error' => 'Gemini did not return a usable response']);
    exit;
}

$text = trim($data['candidates'][0]['content']['parts'][0]['text']);
// Strip markdown code fences if the model added them despite instructions.
$text = preg_replace('/^```json\s*|\s*```$/m', '', $text);

$cards = json_decode($text, true);

if (!is_array($cards)) {
    http_response_code(502);
    echo json_encode(['error' => 'Could not parse Gemini output as JSON']);
    exit;
}

echo json_encode(['cards' => $cards]);
