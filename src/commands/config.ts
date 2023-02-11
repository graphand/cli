import Command from "../lib/Command";
import { displayJSON, getProjectClient } from "../lib/utils";

type Options = {};

export default class extends Command<Options> {
  static command = "config";
  static description = "Get config for models ...";
  static options = [];

  execute = async () => {
    const models = this.command.args;

    if (!models.length) {
      console.log("You need to specify at least one model");
      return;
    }

    const client = await getProjectClient();

    const config = await client.config(models);
    displayJSON(config);
  };
}
