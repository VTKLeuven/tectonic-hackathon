const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

/**
 * The recommendation engine lives in ../engine and is shared with the demo
 * website. Metro watches that folder and transpiles it like app code. The
 * engine has no runtime dependencies; its own node_modules (vitest) are
 * blocked so Metro never crawls or resolves into them.
 */
const config = getDefaultConfig(__dirname);
const engine = path.resolve(__dirname, '..', 'engine');

config.watchFolders = [engine];
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];
const escaped = path.join(engine, 'node_modules').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
config.resolver.blockList = [new RegExp(`^${escaped}[/\\\\].*$`)];

module.exports = config;
