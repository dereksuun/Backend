import { createApp } from "./app.js";
import { env } from "./env.js";

const app = createApp();

app.listen(env.PORT, "0.0.0.0", () => {
  console.log(`Derycash backend running on port ${env.PORT}`);
});
