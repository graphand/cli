#! /usr/bin/env node

import { Command } from "commander";
import "cross-fetch/polyfill";
import { commandsMap } from "./lib/Command";
import "./commands/__register";

const program = new Command();

const commands = Array.from(commandsMap.values());

commands.forEach((CommandClass) => {
  const action = async (options: any, command: Command) => {
    const context = new CommandClass(options, command);
    try {
      return await context.execute();
    } catch (e) {
      console.log(`[${e.constructor.name}] ${e.message}`);
    }
  };

  const operation = program
    .command(CommandClass.command)
    .description(CommandClass.description);

  CommandClass.options.forEach((option) => operation.option(option));

  if (CommandClass.alias?.length) {
    CommandClass.alias.forEach((a) => operation.alias(a));
  }

  operation.action(action);
});

program.parse();
