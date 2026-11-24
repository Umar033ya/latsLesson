// Vercel function. The Nest application is compiled by the build command before functions are packaged.
const handler = require('../apps/backend/dist/serverless.js').default;

module.exports = handler;
// Nest parses the body itself.
module.exports.config = { api: { bodyParser: false } };
