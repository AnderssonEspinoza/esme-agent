import nextVitals from "eslint-config-next";

const config = [
  ...nextVitals,
  {
    ignores: [".next/**", "node_modules/**"],
  },
];

export default config;
