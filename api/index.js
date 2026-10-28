// Vercel serverless entry point. Wraps the Express app from ../server.js.
// The app does not call listen() when VERCEL is set (see server.js).
import app from '../server.js';

export default app;
