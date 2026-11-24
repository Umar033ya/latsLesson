// Vercel function for a project whose root is apps/backend. The whole platform in one project uses /api/index.js instead.
const handler = require('../dist/serverless.js').default;

module.exports = handler;
// Nest parses the body itself.
module.exports.config = { api: { bodyParser: false } };
