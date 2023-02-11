import Command from "../lib/Command";
import { displayJSON, getProjectClient } from "../lib/utils";

type Options = {};

export default class extends Command<Options> {
  static command = "currentAccount";
  static description = "Get the current logged account";
  static options = [];

  execute = async () => {
    const client = await getProjectClient();
    const currentAccount = await client.currentAccount();

    displayJSON(currentAccount.toJSON());
  };
}
