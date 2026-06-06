import app from "../app.js";
// Keep it super simple: no '@vercel/node' types needed
export default function handler(req, res) {
    return app(req, res);
}
