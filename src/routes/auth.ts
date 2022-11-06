import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { z as zod } from "zod";

import { autheticate } from "../plugins/autentica";

export async function authRoutes(fastify: FastifyInstance) {
  fastify.get("/me", { onRequest: [autheticate] }, async (request) => {
    return { user: request.user };
  });

  fastify.post("/users", async (request) => {
    const createUserBody = zod.object({
      access_token: zod.string(),
    });

    const { access_token } = createUserBody.parse(request.body);

    const userResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    const userData = await userResponse.json();

    const userInfoSchema = zod.object({
      id: zod.string(),
      email: zod.string().email(),
      name: zod.string(),
      picture: zod.string().url(),
    });

    const userInfo = userInfoSchema.parse(userData);

    let user = await prisma.user.findUnique({
      where: {
        googleId: userInfo.id,
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          googleId: userInfo.id,
          email: userInfo.email,
          name: userInfo.name,
          avatarUrl: userInfo.picture,
        },
      });
    }

    const token = fastify.jwt.sign(
      {
        name: user.name,
        avatar: user.avatarUrl,
      },
      {
        sub: user.id,
        expiresIn: "7 days",
      }
    );

    return { token };
  });
}
