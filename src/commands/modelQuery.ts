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
  sort: string;
  key?: string | boolean;
  auto: boolean;
  last?: boolean;
};

export default class extends Command<Options> {
  static command = "query";
  static alias = ["get", "list"];
  static description = "Query instances of given model ...";
  static options = [
    "-f, --filter <value>",
    "-l, --limit <value>",
    "-p, --pageSize <value>",
    "-s, --sort <value>",
    "-k, --key [value]",
    "-a, --auto",
    "--last",
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

    let format;

    if (this.options.key) {
      let key = this.options.key === true ? model.configKey : this.options.key;

      key = key || model.configKey;

      if (!key) {
        console.log(
          `Model ${slug} doesn't have a configKey field. Please specify a key with -k [example] option`
        );
        return;
      }

      format = (json) => {
        return "\n" + json.map((item: any) => item[key]).join("\n") + "\n";
      };
    }

    let filter;
    let sort;
    let limit;
    let pageSize;

    if (this.options.last) {
      limit = 1;
      sort = { _id: -1 };
    } else {
      limit = this.options.limit ? parseInt(this.options.limit) : undefined;
      pageSize = this.options.pageSize ? parseInt(this.options.pageSize) : 7;

      if (this.options.sort) {
        if (this.options.sort === "1") {
          sort = { _id: 1 };
        } else if (this.options.sort === "-1") {
          sort = { _id: -1 };
        } else {
          sort = JSON.parse(jsonrepair(this.options.sort));
        }
      }
    }

    if (queryOn) {
      if (isObjectId(queryOn)) {
        filter = { _id: queryOn };
      } else if (model.configKey) {
        filter = { [model.configKey]: queryOn };
      }
    } else if (this.options.filter) {
      filter = JSON.parse(jsonrepair(this.options.filter));
    }

    await infiniteList(
      model,
      { filter, limit, pageSize, sort },
      this.options.auto,
      format
    );
  };
}
