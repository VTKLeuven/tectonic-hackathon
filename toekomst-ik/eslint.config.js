// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", ".expo-export-check/*"],
    rules: {
      // Dutch UI copy uses plain quotes; escaping them hurts readability.
      "react/no-unescaped-entities": "off",
    },
  }
]);
