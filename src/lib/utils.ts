import Client from "@graphand/client";
import Conf from "conf";

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
