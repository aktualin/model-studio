import { prisma } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** Revokes a key (soft delete — keeps usage history, blocks future requests). */
export async function PATCH(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  const existing = await prisma.apiKey.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    return Response.json({ error: "API key tidak ditemukan." }, { status: 404 });
  }

  await prisma.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
  return Response.json({ success: true });
}

/** Permanently deletes a key and its usage counters. */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  const existing = await prisma.apiKey.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    return Response.json({ error: "API key tidak ditemukan." }, { status: 404 });
  }

  await prisma.apiKey.delete({ where: { id } });
  return Response.json({ success: true });
}
