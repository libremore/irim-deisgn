import { resolve } from "node:path";
import { buildSite } from "./build.mjs";
import { readProjectFolders, readProjects } from "./portfolio.mjs";

// Poll project information and image metadata across Windows and Linux.
// Generated HTML is excluded, preventing a build from triggering itself.
export function watchPortfolio(root, { interval = 1000, onBuild = () => {}, onError = (error) => console.error(`Portfolio update failed: ${error.message}`) } = {}) {
  let previous;
  let lastError;
  const refresh = () => {
    try {
      const portfolioRoot = resolve(root, "portfolio");
      const projects = readProjects(portfolioRoot);
      const signature = JSON.stringify({
        folders: readProjectFolders(portfolioRoot).map((folder) => [folder.category, folder.folderName]),
        projects: projects.map((project) => [project.category, project.folderName, project.title, project.region, project.address, project.description, project.areas.map((area) => [area.title, area.images.map((image) => [image.relativePath, image.size, image.mtimeMs])])]),
      });
      if (signature === previous) { lastError = undefined; return; }
      const result = buildSite(root);
      previous = signature;
      lastError = undefined;
      onBuild(result);
    } catch (error) {
      if (lastError !== error.message) onError(error);
      lastError = error.message;
    }
  };
  refresh();
  const timer = setInterval(refresh, interval);
  return { close: () => clearInterval(timer) };
}
