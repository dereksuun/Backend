import { createApp } from "./app.js";
import { env } from "./env.js";

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`Derycash backend running on http://localhost:${env.PORT}`);
});
