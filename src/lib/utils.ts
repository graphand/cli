import Client from "@graphand/client";
import Conf from "conf";
import prompt from "prompt";
import { JSONQuery, Model, models } from "@graphand/core";
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

export const getProjectClient = async () => {
  const conf = await getProjectConf();
  const globalConf = getGlobalConf();
  const { project, environment } = await getProjectInfos();
  projectClient ??= new Client({
    project,
    environment,
    accessToken: conf.get("accessToken") ?? globalConf.get("accessToken"),
    refreshToken: conf.get("refreshToken") ?? globalConf.get("refreshToken"),
  });

  return projectClient;
};

export const getProjectConf = async () => {
  const { project, environment } = await getProjectInfos();
  projectConf ??= new Conf({
    projectName: ["graphand", project, environment].join("."),
  });

  return projectConf;
};

export const initProjectConf = async (): Promise<ProjectPackageInfos> => {
  console.log("Initializing project configuration ...");
  console.log("First, let's create a new project on Graphand");

  const client = getGlobalClient();
  const Project = client.getModel(models.Project);
  const payload = await promptModel(Project);

  console.log(payload);

  return {} as ProjectPackageInfos;
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

export const getProjectInfos = async (
  init?: boolean
): Promise<ProjectPackageInfos> => {
  let packageJson;
  try {
    packageJson = require(process.cwd() + "/package.json");
  } catch (e) {}

  if (!packageJson) {
    throw new Error("package.json not found. Are you in a project directory ?");
  }

  let graphand: ProjectPackageInfos = packageJson.graphand;
  if (!graphand) {
    if (init === undefined) {
      console.log(
        "Graphand is not initialized. Would you like to initialize it ?"
      );
    }

    if (init || (await promptYN())) {
      graphand = await initProjectConf();
    } else {
      throw new Error("You must initialize Graphand first");
    }
  }

  return {
    ...graphand,
    environment: graphand.environment || "master",
  };
};

export const displayJSON = (json: any) => {
  const _read = (err, path, fd, cleanupCb) => {
    if (err) {
      throw err;
    }

    process.on("SIGINT", function () {
      cleanupCb();
      process.exit(0);
    });

    const str = JSON.stringify(json, null, 2);
    writeSync(fd, str);

    const more = spawn(`more "${path}"`, {
      shell: true,
      stdio: "inherit",
    });

    more.on("close", async () => {
      cleanupCb();
    });
  };

  tmp.file(_read);
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
