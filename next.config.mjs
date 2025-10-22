/** @type {import("next").NextConfig} */
const config = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb"
    }
  }
};

export default config;
