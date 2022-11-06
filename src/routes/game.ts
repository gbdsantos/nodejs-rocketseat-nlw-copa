import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { z as zod } from "zod";

import { autheticate } from "../plugins/autentica";

export async function gameRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/pools/:id/games",
    {
      onRequest: [autheticate],
    },
    async (request) => {
      const getPoolParams = zod.object({
        id: zod.string(),
      });

      const { id } = getPoolParams.parse(request.params);

      const games = await prisma.game.findMany({
        orderBy: {
          date: "desc",
        },
        include: {
          guesses: {
            where: {
              participant: {
                userId: request.user.sub,
                poolId: id,
              },
            },
          },
        },
      });

      return {
        games: games.map((game) => {
          return {
            ...game,
            guess: game.guesses.length > 0 ? game.guesses[0] : null,
            guesses: undefined,
          };
        }),
      };
    }
  );
}
