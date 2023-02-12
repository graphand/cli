import Command from "../lib/Command";
import { getGlobalConf } from "../lib/utils";

type Options = {};

export default class extends Command<Options> {
  static command = "logout:user";
  static description = "";
  static options = [];

  execute = async () => {
    const conf = getGlobalConf();
    conf.delete("accessToken");
    conf.delete("refreshToken");

    console.log("Logged out !");
  };
}
