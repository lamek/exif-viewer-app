const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");


exports.getPickerSessionStatus = onRequest(
  {
    cors: true,
  },
  async (req, res) => {
    const sessionId = req.query.sessionId;
    const accessToken = req.headers.authorization?.split('Bearer ')[1];

    if (!accessToken) {
      logger.error("No access token provided for getPickerSessionStatus");
      res.status(401).send({ error: 'Unauthorized: No access token provided' });
      return;
    }

    if (!sessionId) {
      logger.error("No session ID provided for getPickerSessionStatus");
      res.status(400).send({ error: 'Bad Request: No session ID provided' });
      return;
    }

    try {
      const sessionUrl = `https://photospicker.googleapis.com/v1/sessions/${sessionId}`;

      const response = await fetch(sessionUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        logger.error("Error from Google Photos Picker API (get session):", response.status, response.statusText, await response.text());
        res.status(response.status).send({ error: `Google Photos Picker API error: ${response.statusText}` });
        return;
      }

      const sessionStatusData = await response.json();
      logger.info("Picker Session status retrieved successfully:", sessionStatusData);
      res.send(sessionStatusData);

    } catch (error) {
      logger.error("Error getting picker session status:", error);
      res.status(500).send({ error: 'Failed to get picker session status' });
    }
  });