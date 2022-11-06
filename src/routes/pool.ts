import { FastifyInstance } from "fastify";
import ShortUniqueId from "short-unique-id";
import { z as zod } from "zod";

import { prisma } from "../lib/prisma";
import { autheticate } from "../plugins/autentica";

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

    try {
      await request.jwtVerify();

      await prisma.pool.create({
        data: {
          title,
          code,
          ownerId: request.user.sub,

          participants: {
            create: {
              userId: request.user.sub,
            },
          },
        },
      });
    } catch {
      await prisma.pool.create({
        data: {
          title,
          code,
        },
      });
    }

    return reply.status(201).send({ code });
  });

  fastify.post(
    "/pools/:id/join",
    {
      onRequest: [autheticate],
    },
    async (request, reply) => {
      const joinPoolBody = zod.object({
        code: zod.string(),
      });

      const { code } = joinPoolBody.parse(request.body);

      const pool = await prisma.pool.findUnique({
        where: {
          code,
        },
        include: {
          participants: {
            where: {
              userId: request.user.sub,
            },
          },
        },
      });

      if (!pool) {
        return reply.status(400).send({
          message: "Poll not find.",
        });
      }

      if (pool.participants.length > 0) {
        return reply.status(400).send({
          message: "You already joined this poll.",
        });
      }

      if (!pool.ownerId) {
        await prisma.pool.update({
          where: {
            id: pool.id,
          },
          data: {
            ownerId: request.user.sub,
          },
        });
      }

      await prisma.participant.create({
        data: {
          poolId: pool.id,
          userId: request.user.sub,
        },
      });

      return reply.status(201).send();
    }
  );
}
