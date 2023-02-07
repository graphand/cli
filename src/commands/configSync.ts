import Command from "../lib/Command";
import { getProjectClient } from "../lib/utils";
import prompt from "prompt";

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
    const client = getProjectClient();

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
    console.log(res);

    prompt.start();
    const { yesno } = await prompt.get({
      name: "yesno",
      message: "are you sure [y(es)/n(o)]?",
      validator: /y[es]*|n[o]?/,
      warning: "Must respond yes or no",
      default: "no",
    });

    if (yesno.startsWith("y")) {
      await _process();
    }
  };
}
