import { authenticateRequest, forwardToUpstream } from "@/lib/proxy";

export const maxDuration = 120;

interface RouteParams {
  params: Promise<{ path: string[] }>;
}

async function handle(request: Request, { params }: RouteParams): Promise<Response> {
  const auth = await authenticateRequest(request);
  if (!auth.ok) {
    return auth.response;
  }

  const { path } = await params;
  return forwardToUpstream(request, path, auth.key.id);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
