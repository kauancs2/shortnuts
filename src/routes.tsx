import { createBrowserRouter } from "react-router";
import { Settings } from "./pages/settings";
import { App } from "./pages/app";

export const router = createBrowserRouter([
  { path: "/", Component: App },
  { path: "/settings", Component: Settings },

])
