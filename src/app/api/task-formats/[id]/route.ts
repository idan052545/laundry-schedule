import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const { id } = await params;
  const format = await prisma.taskFormat.findUnique({ where: { id } });
  if (!format) {
    return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  }

  // If fileData is a blob URL, return it directly for client-side redirect
  if (format.fileData.startsWith("http")) {
    return NextResponse.json({ blobUrl: format.fileData, fileName: format.fileName, fileType: format.fileType });
  }

  // Legacy base64 support
  return NextResponse.json({ fileData: format.fileData, fileName: format.fileName, fileType: format.fileType });
}
