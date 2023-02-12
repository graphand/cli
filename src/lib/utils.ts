import Client from "@graphand/client";
import Conf from "conf";
import prompt from "prompt";
import { Field, FieldTypes, JSONQuery, Model, models } from "@graphand/core";
import { writeSync, writeFileSync } from "fs";
import { spawn } from "child_process";
import tmp from "tmp";
import { Credentials } from "../types";

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

  if (!globalClient) {
    globalClient = new Client({
      accessToken: conf.get("accessToken"),
      refreshToken: conf.get("refreshToken"),
    });

    globalClient.middleware(async (input) => {
      const { error, fetchResponse, retryToken } = input;
      if (
        fetchResponse.status === 401 &&
        ["INVALID_TOKEN"].includes(error?.code)
      ) {
        let logged = false;
        try {
          console.log(`You need to login to continue...`);

          const credentials: Credentials = await promptFields<Credentials>(
            new Map(
              ["email", "password"].map((f) => [
                f,
                models.User.fieldsMap.get(f),
              ])
            )
          );

          await loginUser(credentials);
          logged = true;
        } catch (e) {
          input.error = e;
        }

        if (logged) {
          throw retryToken;
        }
      }
    });
  }

  return globalClient;
};

export const getProjectClient = async (infos?: ProjectPackageInfos) => {
  infos ??= await getProjectInfos();
  const conf = await getProjectConf(infos);
  const globalConf = getGlobalConf();
  const { project, environment } = infos;

  if (!projectClient) {
    projectClient = new Client({
      project,
      environment,
      accessToken: conf.get("accessToken") ?? globalConf.get("accessToken"),
      refreshToken: conf.get("refreshToken") ?? globalConf.get("refreshToken"),
    });

    projectClient.middleware(async (input) => {
      const { error, fetchResponse, retryToken } = input;
      if (
        fetchResponse.status === 401 &&
        ["INVALID_TOKEN"].includes(error?.code)
      ) {
        let logged;
        try {
          console.log(`You need to login to continue...`);

          const credentials: Credentials = await promptFields<Credentials>(
            new Map(
              ["email", "password"].map((f) => [
                f,
                models.Account.fieldsMap.get(f),
              ])
            )
          );

          await loginProject(credentials, projectClient);
          logged = true;
        } catch (e) {
          input.error = e;
        }

        if (logged) {
          throw retryToken;
        }
      }
    });
  }

  return projectClient;
};

export const getClient = async () => {
  const isGlobal = !isInProject();
  return isGlobal ? getGlobalClient() : getProjectClient();
};

export const getProjectConf = async (infos: ProjectPackageInfos) => {
  projectConf ??= new Conf({
    projectName: ["graphand", infos.project, infos.environment].join("."),
  });

  return projectConf;
};

export const initProjectConf = async (): Promise<ProjectPackageInfos> => {
  console.log("Initializing project configuration ...");

  const _pickProject = async (
    first = true
  ): Promise<InstanceType<typeof models.Project>> => {
    if (first) {
      console.log(
        "First, let's target you project. If you already created a project, please type the project id in the field below. If you want to create a new project, you can leave this field blank."
      );
    }

    let project: InstanceType<typeof models.Project>;
    const { projectId } = await promptFields(
      new Map([["projectId", new Field({ type: FieldTypes.TEXT })]])
    );

    const client = getGlobalClient();
    const Project = client.getModel(models.Project);

    if (projectId) {
      const _project = await Project.get(projectId);
      if (!_project) {
        console.log("Project not found. Please try again.");
        return _pickProject(false);
      }

      const projectClient = await getProjectClient({
        project: _project._id,
        environment: "master",
      });

      const datamodelsCount = await projectClient
        .getModel(models.DataModel)
        .count();

      if (datamodelsCount) {
        console.log(
          `This project seems to already have been initialized (${datamodelsCount} datamodels found). Would you like to continue ?`
        );

        if (!(await promptYN())) {
          return _pickProject(false);
        }
      }

      project = _project;
    } else {
      console.log(
        "Let's create it. We need some informations about your new project."
      );
      const payload = await promptFields(Project.fieldsMap);

      project = await Project.create(payload);
    }

    return project;
  };

  const project = await _pickProject();

  let packageJson;
  try {
    packageJson = require(process.cwd() + "/package.json");
  } catch (e) {}

  let packageConfigured = false;
  if (packageJson) {
    console.log(
      "We detected a package.json file in your project directory. Would you like to add Graphand configuration to it ?"
    );

    if (await promptYN()) {
      packageJson.graphand = {
        project: project._id,
        environment: "master",
      };

      writeFileSync(
        process.cwd() + "/package.json",
        JSON.stringify(packageJson, null, 2)
      );
      packageConfigured = true;
    }
  }

  if (packageConfigured) {
    console.log("Project configuration initialized.");
  } else {
    console.log(`New project with _id ${project._id} created.`);
  }

  return {
    project: project._id,
    environment: "master",
  } as ProjectPackageInfos;
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

export const promptFields = async <R extends any = any>(
  fieldsMap: Map<string, Field<any>>
): Promise<R> => {
  const fields = Array.from(fieldsMap.keys())
    .filter(
      (f: string) =>
        !["_id", "createdAt", "createdBy", "updatedAt", "updatedBy"].includes(f)
    )
    .map((f) => ({
      name: f,
      hidden: f === "password",
      replace: "*",
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
  ) as R;
};

export const isInProject = () => {
  let packageJson;
  try {
    packageJson = require(process.cwd() + "/package.json");
  } catch (e) {}

  if (!packageJson) {
    return false;
  }

  let graphand: ProjectPackageInfos = packageJson.graphand;

  return Boolean(graphand?.project);
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
  auto = false,
  parsePage: (json: any) => string = (json) =>
    JSON.stringify(json, null, 2).slice(1, -1).replace(/\n  /g, "\n")
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
        parsePage(json);

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

export const isObjectId = (input: string) => {
  return /^(?=[a-f\d]{24}$)(\d+[a-f]|[a-f]+\d)/.test(input);
};

export const loginProject = async (
  credentials,
  client?: Client
): Promise<"user" | "account"> => {
  client ??= await getProjectClient();
  const infos = await getProjectInfos();

  let loggedAs: "user" | "account";
  try {
    await client.loginAccount(credentials);
    loggedAs = "account";
  } catch (e) {
    await client.loginUser(credentials);
    loggedAs = "user";
  }

  const conf = await getProjectConf(infos);
  conf.set({
    accessToken: client.options.accessToken,
    refreshToken: client.options.refreshToken,
  });

  console.log("Logged !");

  return loggedAs;
};

export const loginAccount = async (credentials: {
  email: string;
  password: string;
}) => {
  const client = await getProjectClient();
  await client.loginAccount(credentials);

  const infos = await getProjectInfos();
  const conf = await getProjectConf(infos);
  conf.set({
    accessToken: client.options.accessToken,
    refreshToken: client.options.refreshToken,
  });

  console.log("Logged !");
};

export const loginUser = async (credentials: {
  email: string;
  password: string;
}) => {
  const client = getGlobalClient();
  await client.loginUser(credentials);

  const conf = getGlobalConf();
  conf.set({
    accessToken: client.options.accessToken,
    refreshToken: client.options.refreshToken,
  });

  console.log("Logged !");
};
