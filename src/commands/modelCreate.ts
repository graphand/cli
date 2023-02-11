import Command from "../lib/Command";
import { getGlobalClient, getProjectClient, promptFields } from "../lib/utils";
import { jsonrepair } from "jsonrepair";

type Options = {
  json: string;
};

export default class extends Command<Options> {
  static command = "create";
  static description = "Create a new instance of given model ...";
  static options = ["-j, --json <value>"];

  execute = async () => {
    const slug = this.command.args[0];

    let client = getGlobalClient();
    let model = client.getModel(slug);

    if (model.scope !== "global") {
      client = await getProjectClient();
      model = client.getModel(slug);
    }

    await model.initialize();

    let payload: any;

    if (this.options.json) {
      payload = JSON.parse(jsonrepair(this.options.json));
    } else {
      payload = promptFields(model.fieldsMap);
    }

    const instance = await model.create(payload);

    console.log(instance.toJSON());
  };
}
