import dotenv from "dotenv";
import path from "path";

const envFile =
  process.env.NODE_ENV === "test"
    ? ".env.test"
    : process.env.DOTENV_CONFIG_PATH || ".env";

dotenv.config({ path: path.resolve(process.cwd(), envFile) });
