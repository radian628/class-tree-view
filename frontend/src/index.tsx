import { createRoot } from "react-dom";
import React from "react";
import { App } from "./app/app";
import { enableMapSet } from "immer";

enableMapSet();

createRoot(document.getElementById("root")!).render(<App></App>);
