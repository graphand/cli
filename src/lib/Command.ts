import { Command as CommanderCommand } from "commander";

export const commandsMap = new Map<string, typeof Command>();

class Command<Options extends any = any> {
  static command: string;
  static alias: Array<string>;
  static description: string;
  static options: Array<string>;

  options: Options;
  command: CommanderCommand;

  static register(uid: string) {
    commandsMap.set(uid, this);
  }

  constructor(options: Options, _command: CommanderCommand) {
    this.options = options;
    this.command = _command;
  }

  execute = async (): Promise<any> => {};
}

export default Command;
