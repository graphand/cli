import Client from "@graphand/client";
import Conf from "conf";
import prompt from "prompt";
import { JSONQuery, Model } from "@graphand/core";
import { writeSync } from "fs";
import { spawn } from "child_process";
import tmp from "tmp";

type ProjectPackageInfos = {
  project: string;
  environment?: string;
};

let globalConf;
let globalClient;

let projectConf;
let projectClient;

export const getGlobalClient = () => {
  const conf = getGlobalConf();
  globalClient ??= new Client({
    accessToken: conf.get("accessToken"),
    refreshToken: conf.get("refreshToken"),
  });

  return globalClient;
};

export const getProjectClient = () => {
  const conf = getProjectConf();
  const globalConf = getGlobalConf();
  const { project, environment } = getProjectInfos();
  projectClient ??= new Client({
    project,
    environment,
    accessToken: conf.get("accessToken") ?? globalConf.get("accessToken"),
    refreshToken: conf.get("refreshToken") ?? globalConf.get("refreshToken"),
  });

  return projectClient;
};

export const getProjectConf = () => {
  const { project, environment } = getProjectInfos();
  projectConf ??= new Conf({
    projectName: ["graphand", project, environment].join("."),
  });

  return projectConf;
};

export const getGlobalConf = () => {
  globalConf ??= new Conf({ projectName: "graphand" });

  return globalConf;
};

export const promptYN = async () => {
  prompt.start();
  const { yesno } = await prompt.get({
    name: "yesno",
    message: "[y(es)/n(o)]?",
    validator: /y[es]*|n[o]?/,
    warning: "Must respond yes or no",
    default: "yes",
  });

  return yesno.startsWith("y");
};

export const promptModel = async (model: typeof Model) => {
  await model.initialize();

  const fields = Array.from(model.fieldsMap.keys())
    .filter(
      (f: string) =>
        !["_id", "createdAt", "createdBy", "updatedAt", "updatedBy"].includes(f)
    )
    .map((f) => ({
      name: f,
    }));

  prompt.start();
  const payload = await prompt.get(fields);

  return Object.fromEntries(
    Object.entries(payload).map(([key, value]: [string, string]) => {
      if (!value?.length) {
        return [key, undefined];
      }

      return [key, value];
    })
  );
};

export const getProjectInfos = (): ProjectPackageInfos => {
  const packageJson = require(process.cwd() + "/package.json");
  if (!packageJson.graphand) {
    throw new Error("Missing graphand infos in package.json");
  }
  if (!packageJson.graphand.project) {
    throw new Error("Missing project in package.json");
  }

  return {
    ...packageJson.graphand,
    environment: packageJson.graphand.environment || "master",
  };
};

export const infiniteList = async (
  model: typeof Model,
  query: JSONQuery,
  auto = false
) => {
  const pageSize = query.pageSize ?? 7;
  const firstPage = await model.getList({ ...query, pageSize, page: 0 });
  const max = firstPage.count;
  const pagesCount = Math.ceil(max / pageSize);

  const _read = (err, path, fd, cleanupCb) => {
    if (err) {
      throw err;
    }

    process.on("SIGINT", function () {
      cleanupCb();
      process.exit(0);
    });

    const _loadPage = async (page: number = 0, prevStr = "") => {
      const res = await model.getList({ ...query, pageSize, page });
      const json = res.toArray().map((i) => i.toJSON());
      const from = page * pageSize;
      let to = (page + 1) * pageSize;
      to = to > max ? max : to;
      const str =
        `PAGE ${
          page + 1
        } / ${pagesCount} (${from} to ${to} of ${max} results)` +
        JSON.stringify(json, null, 2).slice(1, -1).replace(/\n  /g, "\n");

      writeSync(fd, str);

      let prevLines = (prevStr.match(/\n/g) || []).length - 4;

      if (prevLines < 0) {
        prevLines = 0;
      }

      const more = spawn(`more +${prevLines} "${path}"`, {
        shell: true,
        stdio: "inherit",
      });

      more.on("close", async () => {
        if (page + 1 >= pagesCount) {
          console.log("EOF");
          cleanupCb();
        } else if (auto) {
          _loadPage(page + 1, prevStr + str);
        } else {
          console.log(`Continue ?`);
          if (await promptYN()) {
            _loadPage(page + 1, prevStr + str);
          } else {
            cleanupCb();
          }
        }
      });
    };

    _loadPage(0);
  };

  tmp.file(_read);
};
