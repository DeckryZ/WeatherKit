import { handle } from "hono/vercel";
import app from "../src/Hono.js";

export const config = {
    runtime: "edge",
    regions: ["hkg1"],
};

export default handle(app);
