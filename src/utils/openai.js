import Router from "express";
import OpenAI from "openai";
// import { SocksProxyAgent } from "socks-proxy-agent";

import { OPENAI_KEY, ORGANIZATION_ID } from "../config";

const router = Router();
const openai = new OpenAI({
  apiKey: OPENAI_KEY,
  organization: ORGANIZATION_ID,
  // httpAgent: new SocksProxyAgent(process.env.PROXY_URL)
});

router.get("/", async (req, res) => {
  try {
    let message = `Generate ${req.query.count} ${req.query.tone} ${req.query.type} in ecommerce ${req.query.category} field.
    Here is some extra information about generation. ${req.query.prompt}
    Output must be array format like following.
    ["first result", "second result", "third result", ... ]
    `;
    const chat = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: message },
      ]
    });
    if (chat.error) {
      return res.json({ status: 400 });
    }
    return res.json({
      status: 200,
      answers: JSON.parse(chat.choices[0].message.content),
    });
  } catch (err) {
    return res.json({ status: 500, err });
  }
});

export default router;
