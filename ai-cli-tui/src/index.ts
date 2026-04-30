#!/usr/bin/env node
import { main } from "./tui.js";

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
