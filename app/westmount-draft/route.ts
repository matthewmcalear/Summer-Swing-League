import { NextResponse } from "next/server";

export function GET(request: Request) {
  const url = new URL("/westmount-draft.html", request.url);
  return NextResponse.redirect(url, 302);
}
