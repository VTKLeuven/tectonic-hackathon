/**
 * app.json plus one runtime switch: EXPO_BASE_URL lets the web export live
 * under a sub-path (the Docker image serves it at /app, next to the demo site).
 */
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}),
  },
});
