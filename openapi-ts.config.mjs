/** @type {import('@hey-api/openapi-ts').UserConfig} */
export default {
  input: './artifacts/openapi.json',
  output: {
    clean: true,
    path: './artifacts/sdk',
  },
};
