const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

exports.createPickerSession = onRequest(
  {
    cors: true,
  },
  async (req, res) => {
    const accessToken = req.headers.authorization?.split('Bearer ')[1];

    if (!accessToken) {
      logger.error("No access token provided for createPickerSession");
      res.status(401).send({ error: 'Unauthorized: No access token provided' });
      return;
    }

    try {
      const response = await fetch('https://photospicker.googleapis.com/v1/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorBodyText = await response.text();
        logger.error("Error from Google Photos Picker API:", response.status, response.statusText, errorBodyText);
        
        if (response.status === 401 || response.status === 403 || errorBodyText.includes("insufficientPermissions")) {
             res.status(403).send({ 
                 error: 'Insufficient permissions granted by user.',
                 code: 'insufficient-permissions'
             });
        } else {
             res.status(response.status).send({ error: `Google Photos Picker API error: ${response.statusText}`, details: errorBodyText });
        }
        return;
      }

      const sessionData = await response.json();
      logger.info("Picker Session created successfully:", sessionData);
      res.send(sessionData); 

    } catch (error) {
      logger.error("Error creating picker session:", error);
      res.status(500).send({ error: 'Failed to create picker session' });
    }
  });