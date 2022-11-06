import { FastifyRequest } from "fastify";

export async function autheticate(request: FastifyRequest) {
  await request.jwtVerify();
}
