import Command from "../lib/Command";
import {
  getGlobalClient,
  getProjectClient,
  infiniteList,
  isObjectId,
} from "../lib/utils";
import { jsonrepair } from "jsonrepair";

type Options = {
  filter: string;
  limit: string;
  pageSize: string;
  auto: boolean;
};

export default class extends Command<Options> {
  static command = "query";
  static alias = "get";
  static description = "Query instances of given model ...";
  static options = [
    "-f, --filter <value>",
    "-l, --limit <value>",
    "-p, --pageSize <value>",
    "-a, --auto",
  ];

  execute = async () => {
    const slug = this.command.args[0];
    const queryOn = this.command.args[1];

    let client = getGlobalClient();
    let model = client.getModel(slug);

    if (model.scope !== "global") {
      client = await getProjectClient();
      model = client.getModel(slug);
    }

    await model.initialize();

    let filter;

    if (queryOn) {
      if (isObjectId(queryOn)) {
        filter = { _id: queryOn };
      } else if (model.configKey) {
        filter = { [model.configKey]: queryOn };
      }
    } else if (this.options.filter) {
      filter = JSON.parse(jsonrepair(this.options.filter));
    }

    const limit = this.options.limit ? parseInt(this.options.limit) : undefined;
    const pageSize = this.options.pageSize
      ? parseInt(this.options.pageSize)
      : 7;

    await infiniteList(model, { filter, limit, pageSize }, this.options.auto);
  };
}
