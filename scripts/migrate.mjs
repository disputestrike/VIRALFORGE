import { createRepository } from "../src/db.mjs";

const repo = await createRepository();
await repo.close();
console.log("ViralForge migrations complete.");
