import axios from 'axios';

export default async function handler(req, res) {
  // 1. Enable Global CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 2. Extract the target URL from the incoming request path or query string
  // This supports both:
  // /api/proxy?url=https://... OR grabbing it directly if you forward the path
  let targetUrl = req.query.url || req.url.replace('/api/proxy/', '').replace('/api/proxy', '');

  // Clean up any double slashes caused by path parsing
  if (targetUrl.startsWith('http:/') && !targetUrl.startsWith('http://')) {
    targetUrl = targetUrl.replace('http:/', 'http://');
  } else if (targetUrl.startsWith('https:/') && !targetUrl.startsWith('https://')) {
    targetUrl = targetUrl.replace('https:/', 'https://');
  }

  if (!targetUrl || !targetUrl.startsWith('http')) {
    return res.status(400).json({ 
      error: 'Invalid target URL', 
      usage: 'Example: https://vercel.app' 
    });
  }

  try {
    // 3. Spoof browser headers so the target API thinks it's a real user, not a script
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.method !== 'GET' ? req.body : undefined,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 10000 // 10 second timeout
    });

    // 4. Return the API data back to your application
    return res.status(response.status).json(response.data);

  } catch (error) {
    return res.status(error.response?.status || 500).json({
      error: 'Proxy Error',
      message: error.message,
      target: targetUrl
    });
  }
}
