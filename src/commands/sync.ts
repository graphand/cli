import Command from "../lib/Command";

type Options = {
  test: string;
};

export default class extends Command<Options> {
  static command = "sync";
  static description = "Lorem ipsum ...";
  static options = ["-t, --test [value]"];

  execute = async () => {
    console.log("Syncing...");
  };
}
