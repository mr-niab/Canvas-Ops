import { createRoot } from "react-dom/client";
import App from "./App";
import { AcceptInvitePage } from "./pages/AcceptInvitePage";
import "./index.css";

const base = import.meta.env.BASE_URL || "/";
const path = window.location.pathname;
const normalisedBase = base.endsWith("/") ? base : `${base}/`;
const relPath = path.startsWith(normalisedBase)
  ? path.slice(normalisedBase.length - 1)
  : path;

const isAcceptInvite =
  relPath === "/accept-invite" || relPath.startsWith("/accept-invite/") || relPath.startsWith("/accept-invite?");

createRoot(document.getElementById("root")!).render(
  isAcceptInvite ? <AcceptInvitePage /> : <App />,
);
