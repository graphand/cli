import Command from "../lib/Command";
import { getProjectClient, promptYN } from "../lib/utils";

type Options = {
  clean?: boolean;
  force?: boolean;
};

export default class extends Command<Options> {
  static command = "config:sync";
  static description = "Lorem ipsum ...";
  static options = ["-c, --clean", "-f, --force"];

  execute = async () => {
    const { clean } = this.options;
    const configJson = require(process.cwd() + "/graphand.config.json");
    const client = await getProjectClient();

    const _process = async () => {
      const res = await client.configSync(configJson, {
        clean,
        confirm: true,
      });
      console.log(res);
    };

    if (this.options.force) {
      await _process();
      return;
    }

    const res = await client.configSync(configJson, { clean });
    const operationsCount = Object.values(res).reduce(
      (acc: number, val: any) => acc + val.created + val.updated + val.deleted,
      0
    );
    if (!operationsCount) {
      console.log("Config is already synced");
      return;
    }

    console.log(`Would you like to continue ?`, res);
    if (await promptYN()) {
      await _process();
    }
  };
}
