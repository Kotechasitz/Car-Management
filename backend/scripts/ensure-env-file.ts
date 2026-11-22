import { copyFileSync, existsSync } from "node:fs";

const envFilePath = ".env";
const envExampleFilePath = ".env.example";

if (!existsSync(envFilePath)) {
  copyFileSync(envExampleFilePath, envFilePath);
  console.info(`Created ${envFilePath} from ${envExampleFilePath}`);
}
