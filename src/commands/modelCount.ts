import Command from "../lib/Command";
import { getGlobalClient, getProjectClient } from "../lib/utils";
import { jsonrepair } from "jsonrepair";

type Options = {
  filter: any;
  limit: string;
};

export default class extends Command<Options> {
  static command = "count";
  static description = "Count number of instances of given model ...";
  static options = ["-f, --filter [value]", "-l, --limit [value]"];

  execute = async () => {
    const slug = this.command.args[0];

    let client = getGlobalClient();
    let model = client.getModel(slug);

    if (model.scope !== "global") {
      client = await getProjectClient();
      model = client.getModel(slug);
    }

    const filter = this.options.filter
      ? JSON.parse(jsonrepair(this.options.filter))
      : undefined;
    const limit = this.options.limit ? parseInt(this.options.limit) : undefined;

    const count = await model.count({ filter, limit });

    console.log(count);
  };
}
