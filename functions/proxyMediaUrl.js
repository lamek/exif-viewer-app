const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const stream = require('stream');


exports.proxyMediaUrl = onRequest(
  {
    cors: true,
  },
  async (req, res) => {

    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET, POST');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.set('Access-Control-Max-Age', '3600');
      res.status(204).send('');
      return;
    }

    const accessToken = req.headers.authorization?.split('Bearer ')[1] || req.query.accessToken; 
    
    logger.info("ProxyMediaUrl Function Received Headers:", req.headers);
    logger.info("ProxyMediaUrl Function Extracted Access Token:", accessToken ? "Token received (masked)" : "No token extracted");


    if (!accessToken) {
      logger.error("No access token provided for proxyMediaUrl (after extraction attempt)");
      res.status(401).send({ error: 'Unauthorized: No access token provided' });
      return;
    }

    const baseUrl = req.query.baseUrl;
    const mediaType = req.query.type;
    const sizeParam = req.query.size; 

    let finalUrl = baseUrl;
    if (mediaType === 'VIDEO') {
        finalUrl = `${baseUrl}=dv`;
    } else {
        finalUrl = sizeParam ? `${baseUrl}=${sizeParam}` : `${baseUrl}=w2048-h2048`;
    }

    try {
      const response = await fetch(finalUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorBodyText = await response.text();
        logger.error("Error fetching media from Google Photos:", response.status, response.statusText, errorBodyText);
        res.status(response.status).send({ error: `Failed to fetch media from Google Photos: ${response.statusText}`, details: errorBodyText });
        return;
      }

      res.set('Content-Type', response.headers.get('Content-Type'));
      res.set('Content-Disposition', response.headers.get('Content-Disposition') || 'inline');
      res.status(response.status);

      stream.Readable.from(response.body).pipe(res);

    } catch (error) {
      logger.error("Error in proxyMediaUrl function:", error);
      res.status(500).send({ error: 'Failed to proxy media URL' });
    }
  });