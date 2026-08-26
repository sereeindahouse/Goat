import type { IncomingMessage, ServerResponse } from "node:http";
import app from "../dist/boot.js";

export default async function handler(req: IncomingMessage, res: ServerResponse) {
	const headers = new Headers();
	for (const [name, value] of Object.entries(req.headers)) {
		if (value) headers.set(name, Array.isArray(value) ? value.join(", ") : value);
	}

	const chunks: Buffer[] = [];
	for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));

	const protocol = headers.get("x-forwarded-proto") ?? "https";
	const host = headers.get("host") ?? "localhost";
	const request = new Request(`${protocol}://${host}${req.url ?? "/"}`, {
		method: req.method,
		headers,
		body: req.method === "GET" || req.method === "HEAD" ? undefined : Buffer.concat(chunks),
		duplex: "half",
	});
	const response = await app.fetch(request);

	res.statusCode = response.status;
	response.headers.forEach((value, name) => res.setHeader(name, value));
	res.end(Buffer.from(await response.arrayBuffer()));
}