import Command from "../lib/Command";
import prompt from "prompt";
import {
  getGlobalClient,
  getProjectClient,
  getProjectInfos,
} from "../lib/utils";

type Options = {};

export default class extends Command<Options> {
  static command = "create";
  static description = "Create a new instance of given model ...";
  static options = [];

  execute = async () => {
    const slug = this.command.args[0];

    let client = getGlobalClient();
    let model = client.getModel(slug);

    if (model.scope !== "global") {
      client = getProjectClient();
      model = client.getModel(slug);
    }

    await model.initialize();

    const fields = Array.from(model.fieldsMap.keys())
      .filter(
        (f: string) =>
          !["_id", "createdAt", "createdBy", "updatedAt", "updatedBy"].includes(
            f
          )
      )
      .map((f) => ({
        name: f,
      }));

    prompt.start();
    let payload = await prompt.get(fields);

    payload = Object.fromEntries(
      Object.entries(payload).map(([key, value]: [string, string]) => {
        if (!value?.length) {
          return [key, undefined];
        }

        return [key, value];
      })
    );

    const instance = await model.create(payload);

    console.log(instance.toJSON());
  };
}
