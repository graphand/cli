import Command from "../lib/Command";
import { getProjectConf, getProjectInfos } from "../lib/utils";

type Options = {};

export default class extends Command<Options> {
  static command = "logout:account";
  static description = "";
  static options = [];

  execute = async () => {
    const infos = await getProjectInfos();
    const conf = await getProjectConf(infos);
    conf.delete("accessToken");
    conf.delete("refreshToken");

    console.log("Logged out !");
  };
}
