import next from "eslint-config-next";

const config = [
  ...next,
  { ignores: [".next/**", "node_modules/**", "drizzle/**"] },
  // Avatars are small data-URLs resized on-device; next/image adds nothing here.
  { rules: { "@next/next/no-img-element": "off" } },
];

export default config;
