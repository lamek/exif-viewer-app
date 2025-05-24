/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const {setGlobalOptions} = require('firebase-functions/v2'); // NEW: Add this import if not already there

setGlobalOptions({maxInstances: 10});
// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

exports.createPickerSession = require('./createPickerSession');
exports.getPickerSessionStatus = require('./getPickerSessionStatus');
exports.listPickedMediaItems = require('./listPickedMediaItems');
exports.proxyMediaUrl = require('./proxyMediaUrl');