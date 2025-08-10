import { Hono } from "hono";
import importRoutes from "./routes/import.route.js";

const app = new Hono();

app.get("/health", async (c) => {
	return c.text("OK", 200);
});

app.route("/import", importRoutes);

app.onError((err, c) => {
	console.error("Unhandled error:", err);
	return c.json({ error: "Internal server error" }, 500);
});

app.notFound((c) => {
	return c.json({ error: "Not found" }, 404);
});

export default app;
