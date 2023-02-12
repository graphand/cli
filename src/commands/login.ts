import Command from "../lib/Command";
import {
  getClient,
  isInProject,
  loginProject,
  promptFields,
} from "../lib/utils";
import { models } from "@graphand/core";

type Options = {
  email?: string;
  password?: string;
};

export default class extends Command<Options> {
  static command = "login";
  static description = "";
  static options = ["-e, --email [value]", "-p, --password [value]"];

  execute = async () => {
    const optionsKeys = Object.keys(this.options);
    const fieldsKeys = ["email", "password"].filter(
      (f) => !optionsKeys.includes(f)
    );

    const _promptFields = new Map(
      fieldsKeys.map((f) => {
        return [f, models.User.fieldsMap.get(f)];
      })
    );

    const credentials = Object.assign(
      {},
      this.options,
      await promptFields(_promptFields)
    );

    const isGlobal = !isInProject();

    const client = await getClient();

    let loggedAs: string;
    if (isGlobal) {
      await client.loginUser(credentials);
      loggedAs = "user";
    } else {
      loggedAs = await loginProject(credentials, client);
    }

    console.log(`Logged in successfully as ${loggedAs}!`);
  };
}
