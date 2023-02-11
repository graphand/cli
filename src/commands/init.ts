import Command from "../lib/Command";
import { getGlobalClient, promptModel } from "../lib/utils";
import { models } from "@graphand/core";

type Options = {};

export default class extends Command<Options> {
  static command = "init";
  static description = "Initialize ...";
  static options = [];

  execute = async () => {
    const packageJson = require(process.cwd() + "/package.json");

    if (packageJson.graphand) {
      console.log("Graphand is already initialized");
      return;
    }

    const client = getGlobalClient();
    const Project = client.getModel(models.Project);
    const payload = await promptModel(Project);

    console.log(payload);
  };
}
