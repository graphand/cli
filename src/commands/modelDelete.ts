import Command from "../lib/Command";
import {
  getGlobalClient,
  getProjectClient,
  infiniteList,
  isObjectId,
} from "../lib/utils";
import { jsonrepair } from "jsonrepair";
import { Model } from "@graphand/core";

type Options = {
  filter: string;
  limit: string;
  pageSize: string;
  sort: string;
};

export default class extends Command<Options> {
  static command = "delete";
  static description = "Delete instances of given model ...";
  static options = [
    "-f, --filter <value>",
    "-l, --limit <value>",
    "-p, --pageSize <value>",
    "-s, --sort <value>",
  ];

  execute = async () => {
    const slug = this.command.args[0];
    const queryOn = this.command.args[1];

    let client = getGlobalClient();
    let model: typeof Model = client.getModel(slug);

    if (model.scope !== "global") {
      client = await getProjectClient();
      model = client.getModel(slug);
    }

    await model.initialize();

    let format;

    let filter;
    let sort;
    let limit;
    let pageSize;

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

    if (queryOn) {
      if (isObjectId(queryOn)) {
        filter = { _id: queryOn };
      } else if (model.configKey) {
        filter = { [model.configKey]: queryOn };
      }
    } else if (this.options.filter) {
      filter = JSON.parse(jsonrepair(this.options.filter));
    }

    const deleted = await model.delete({ filter, limit, pageSize, sort });

    console.log(deleted);
  };
}
