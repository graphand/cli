import Command from "../lib/Command";
import { displayJSON, getGlobalClient } from "../lib/utils";

type Options = {};

export default class extends Command<Options> {
  static command = "currentUser";
  static description = "Get the current logged user";
  static options = [];

  execute = async () => {
    const client = await getGlobalClient();
    const currentUser = await client.currentUser();

    displayJSON(currentUser.toJSON());
  };
}
