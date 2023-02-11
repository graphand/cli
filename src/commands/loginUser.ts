import Command from "../lib/Command";
import prompt from "prompt";
import { getGlobalClient, getGlobalConf } from "../lib/utils";

type Options = {
  email?: string;
  password?: string;
};

export default class extends Command<Options> {
  static command = "login:user";
  static description = "";
  static options = ["-e, --email [value]", "-p, --password [value]"];

  execute = async () => {
    const optionsKeys = Object.keys(this.options);
    const fields = ["email", "password"].filter(
      (f) => !optionsKeys.includes(f)
    );

    prompt.start();
    const credentials = Object.assign(
      {},
      this.options,
      await prompt.get(fields)
    );

    console.log("Logging in...");

    const client = getGlobalClient();
    await client.loginUser(credentials);

    const conf = getGlobalConf();
    console.log({
      accessToken: client.options.accessToken,
      refreshToken: client.options.refreshToken,
    });
    conf.set({
      accessToken: client.options.accessToken,
      refreshToken: client.options.refreshToken,
    });
  };
}
