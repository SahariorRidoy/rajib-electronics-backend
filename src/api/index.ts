import app from "../app.js";


// Keep it super simple: no '@vercel/node' types needed
export default function handler(req: any, res: any) {
  return app(req, res);
}
