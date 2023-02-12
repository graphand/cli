import Command from "../lib/Command";
import { getProjectInfos, initProjectConf } from "../lib/utils";

type Options = {
  force?: boolean;
};

export default class extends Command<Options> {
  static command = "init";
  static description = "Initialize ...";
  static options = ["-f, --force"];

  execute = async () => {
    let packageJson;
    try {
      packageJson = require(process.cwd() + "/package.json");

      if (packageJson?.graphand && !this.options.force) {
        console.log("Graphand is already initialized");
        return;
      }
    } catch (e) {}

    if (!packageJson) {
      throw new Error(
        "package.json not found. Are you in a project directory ?"
      );
    }

    await initProjectConf();

    console.log("Graphand initialized successfully");
  };
}
