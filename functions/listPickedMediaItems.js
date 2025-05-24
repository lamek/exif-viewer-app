const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

exports.listPickedMediaItems = onRequest(
  {
    cors: true,
  },
  async (req, res) => {
    const sessionId = req.query.sessionId;
    const pageSize = req.query.pageSize || 25;
    const pageToken = req.query.pageToken;
    const accessToken = req.headers.authorization?.split('Bearer ')[1];

    if (!accessToken) {
      logger.error("No access token provided for listPickedMediaItems");
      res.status(401).send({ error: 'Unauthorized: No access token provided' });
      return;
    }

    if (!sessionId) {
      logger.error("No session ID provided for listPickedMediaItems");
      res.status(400).send({ error: 'Bad Request: No session ID provided' });
      return;
    }

    try {
      let itemsQuery = `sessionId=${sessionId}&pageSize=${pageSize}`;
      if (pageToken) {
        itemsQuery += `&pageToken=${pageToken}`;
      }

      const mediaItemsUrl = `https://photospicker.googleapis.com/v1/mediaItems?${itemsQuery}`;

      const response = await fetch(mediaItemsUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text(); 
        logger.error("Error from Google Photos Picker API (list media items):", response.status, response.statusText, errorText);
        
        if (response.status === 400 && errorText.includes("FAILED_PRECONDITION")) {
            res.status(400).send({ error: 'Google Photos Picker API error: Media items not yet ready. Please retry.', code: 'media-not-ready' });
        } else {
            res.status(response.status).send({ error: `Google Photos Picker API error: ${response.statusText}`, details: errorText });
        }
        return;
      }

      const mediaItemsData = await response.json();
      logger.info("Media items retrieved successfully:", mediaItemsData);
      res.send(mediaItemsData);

    } catch (error) {
      logger.error("Error listing media items:", error);
      res.status(500).send({ error: 'Failed to list media items' });
    }
  });