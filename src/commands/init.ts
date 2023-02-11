import Command from "../lib/Command";
import { getProjectInfos } from "../lib/utils";

type Options = {};

export default class extends Command<Options> {
  static command = "init";
  static description = "Initialize ...";
  static options = [];

  execute = async () => {
    let packageJson;
    try {
      packageJson = require(process.cwd() + "/package.json");

      if (packageJson?.graphand) {
        console.log("Graphand is already initialized");
        return;
      }
    } catch (e) {}

    const projectInfos = await getProjectInfos(true);

    // TODO : create project + update package.json + detect graphand.config.json
  };
}
