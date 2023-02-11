import Command from "../lib/Command";
import { getGlobalClient, getProjectClient, infiniteList } from "../lib/utils";
import { jsonrepair } from "jsonrepair";
import { models } from "@graphand/core";

type Options = {
  filter: string;
  limit: string;
  pageSize: string;
  auto: boolean;
};

export default class extends Command<Options> {
  static command = "currentAccount";
  static description = "Get the current logged account";
  static options = [];

  execute = async () => {
    const client = getProjectClient();
    const currentAccount = await client.currentAccount();

    await infiniteList(client.getModel(models.Account), {
      ids: [currentAccount._id],
    });
  };
}
