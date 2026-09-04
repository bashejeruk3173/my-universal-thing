import axios from 'axios';

export default async function handler(req, res) {
  // 1. Enable Global CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let targetUrl = '';

  // 2. Extract target URL from query parameter or raw path
  if (req.query.url) {
    targetUrl = req.query.url;
    const rawUrl = req.url;
    const urlParamIndex = rawUrl.indexOf('url=');
    if (urlParamIndex !== -1) {
      const standardQueryStart = rawUrl.indexOf('&', urlParamIndex);
      if (standardQueryStart !== -1) {
        targetUrl += rawUrl.substring(standardQueryStart);
      }
    }
  } else {
    let rawPath = req.url;
    if (rawPath.startsWith('/api/proxy')) {
      rawPath = rawPath.replace('/api/proxy', '');
    }
    if (rawPath.startsWith('/')) {
      rawPath = rawPath.substring(1);
    }
    targetUrl = rawPath;
  }

  // Clean up single slashes
  if (targetUrl.startsWith('http:/') && !targetUrl.startsWith('http://')) {
    targetUrl = targetUrl.replace('http:/', 'http://');
  } else if (targetUrl.startsWith('https:/') && !targetUrl.startsWith('https://')) {
    targetUrl = targetUrl.replace('https:/', 'https://');
  }

  // Fix broken syntax variations like /&id= to /?id=
  if (targetUrl.includes('/&')) {
    targetUrl = targetUrl.replace('/&', '/?');
  }

  if (!targetUrl || !targetUrl.startsWith('http')) {
    return res.status(400).json({ 
      error: 'Invalid target URL', 
      detected: targetUrl
    });
  }

  try {
    // 3. Spoof browser headers
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.method !== 'GET' ? req.body : undefined,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 15000
    });

    return res.status(response.status).json(response.data);

  } catch (error) {
    return res.status(error.response?.status || 500).json({
      error: 'Proxy Error',
      message: error.message,
      target: targetUrl
    });
  }
}
