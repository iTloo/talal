import { NextResponse } from "next/server"
import { currentData, historyData, requestLogs } from "../data/route"

export async function GET() {
  return NextResponse.json({
    serverTime: new Date().toISOString(),
    currentData,
    historyData: historyData.slice(-10), // آخر 10 سجلات فقط
    historyCount: historyData.length,
    requestLogs: requestLogs.slice(0, 20), // آخر 20 سجل فقط
    requestLogsCount: requestLogs.length
  })
}
