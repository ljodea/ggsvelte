import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { attendees } from "./data.js";

export default defineExample(
  gg(attendees, aes({ x: "track", fill: "level" }))
    .geomBar({ position: "dodge" })
    .labs({
      title: "Conference attendees by track and experience",
      x: "Track",
      y: "Attendees",
      fill: "Experience",
    })
    .spec(),
);
