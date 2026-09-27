import { logger } from "../utils/logger.js";

export class ConsoleSmsAdapter {
  async send(message) {
    if (process.env.NODE_ENV === "production")
      throw new Error("Configure a production SMS adapter before sending SMS.");
    if (process.env.NODE_ENV === "test") return { delivered: true, demo: true };
    logger.info("development_sms", message);
    return { delivered: true, demo: true };
  }
}

let adapter = new ConsoleSmsAdapter();
export const setSmsAdapter = (nextAdapter) => {
  adapter = nextAdapter;
};
export const sendSms = (message) => adapter.send(message);
