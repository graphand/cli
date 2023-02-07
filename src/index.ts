#! /usr/bin/env node

import { Command } from "commander";
import "cross-fetch/polyfill";
import { commandsMap } from "./lib/Command";
import "./commands/__register";

const program = new Command();

const commands = Array.from(commandsMap.values());

commands.forEach((CommandClass) => {
  const action = (options: any, command: Command) => {
    const context = new CommandClass(options, command);
    return context.execute();
  };

  const operation = program
    .command(CommandClass.command)
    .description(CommandClass.description);

  CommandClass.options.forEach((option) => operation.option(option));

  operation.action(action);
});

program.parse();
