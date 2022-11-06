import { FastifyInstance } from "fastify";
import ShortUniqueId from "short-unique-id";
import { z as zod } from "zod";

import { prisma } from "../lib/prisma";

export async function poolRoutes(fastify: FastifyInstance) {
  fastify.get("/pools/count", async () => {
    const count = await prisma.pool.count();

    return { count };
  });

  fastify.post("/pools", async (request, reply) => {
    const createPoolBody = zod.object({
      title: zod.string(),
    });

    const { title } = createPoolBody.parse(request.body);

    const generatedId = new ShortUniqueId({ length: 6 });
    const code = String(generatedId()).toUpperCase();

    await prisma.pool.create({
      data: {
        title,
        code,
      },
    });

    return reply.status(201).send({ code });
  });
}
