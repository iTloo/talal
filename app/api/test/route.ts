import { type NextRequest, NextResponse } from "next/server"
import { addLog } from "../data/route"

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString()
  
  const response = {
    status: "success",
    message: "تم الاتصال بالخادم بنجاح",
    timestamp,
    serverInfo: {
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime()
    }
  }
  
  return NextResponse.json(response)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const timestamp = new Date().toISOString()
    
    const response = {
      status: "success",
      message: "تم استلام بيانات الاختبار بنجاح",
      timestamp,
      receivedData: body
    }
    
    return NextResponse.json(response)
  } catch (error) {
    return NextResponse.json({ 
      status: "error",
      message: "خطأ في معالجة بيانات الاختبار",
      timestamp: new Date().toISOString()
    }, { status: 400 })
  }
}
