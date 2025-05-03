import { type NextRequest, NextResponse } from "next/server"

// تعريف أنواع البيانات
interface SensorData {
  temperature: number
  waterLevel: number
  lastUpdate: string
  deviceId: string
}

interface HistoryRecord {
  temperature: number
  waterLevel: number
  timestamp: string
  deviceId: string
}

// بيانات مخزنة في الذاكرة (ستُفقد عند إعادة تشغيل الخادم)
export let currentData: Record<string, SensorData> = {
  "ESP8266MOD": {
    temperature: 25,
    waterLevel: 0,
    lastUpdate: new Date().toISOString(),
    deviceId: "ESP8266MOD",
  }
}

// سجل البيانات التاريخية
export let historyData: HistoryRecord[] = []

// سجل الطلبات للتشخيص
export let requestLogs: Array<{
  timestamp: string
  method: string
  path: string
  body?: any
  response?: any
  ip?: string
}> = []

// الحد الأقصى لعدد السجلات المخزنة
const MAX_HISTORY_LENGTH = 100
const MAX_LOGS_LENGTH = 50

// دالة لإضافة سجل
function addLog(method: string, path: string, body?: any, response?: any, ip?: string) {
  const log = {
    timestamp: new Date().toISOString(),
    method,
    path,
    body,
    response,
    ip
  }
  
  requestLogs.unshift(log)
  
  if (requestLogs.length > MAX_LOGS_LENGTH) {
    requestLogs = requestLogs.slice(0, MAX_LOGS_LENGTH)
  }
}

/**
 * معالجة طلبات GET للحصول على البيانات الحالية والتاريخية
 */
export async function GET(request: NextRequest) {
  try {
    // الحصول على معرف الجهاز من معلمات الاستعلام (إذا تم تحديده)
    const searchParams = request.nextUrl.searchParams
    const deviceId = searchParams.get("deviceId")
    
    console.log(`تم استلام طلب GET - ${new Date().toISOString()}`)
    console.log(`معلمات الاستعلام: ${deviceId ? `deviceId=${deviceId}` : "لا توجد"}`)
    
    let responseData: any = {}
    
    // إذا تم تحديد معرف الجهاز، أعد البيانات لهذا الجهاز فقط
    if (deviceId && currentData[deviceId]) {
      const deviceHistory = historyData.filter(record => record.deviceId === deviceId)
      
      responseData = {
        current: currentData[deviceId],
        history: deviceHistory.slice(-10), // إرجاع آخر 10 قراءات فقط
      }
    } else {
      // إذا لم يتم تحديد معرف الجهاز، أعد بيانات جميع الأجهزة
      responseData = {
        current: Object.values(currentData),
        history: historyData.slice(-10), // إرجاع آخر 10 قراءات فقط
      }
    }
    
    // إضافة سجل
    addLog("GET", "/api/data", null, responseData, request.ip)
    
    return NextResponse.json(responseData)
  } catch (error) {
    console.error("خطأ في معالجة طلب GET:", error)
    return NextResponse.json({ error: "خطأ في معالجة الطلب" }, { status: 500 })
  }
}

/**
 * معالجة طلبات POST لإضافة بيانات جديدة
 */
export async function POST(request: NextRequest) {
  try {
    console.log(`تم استلام طلب POST - ${new Date().toISOString()}`)
    
    const body = await request.json()
    console.log("البيانات المستلمة:", body)
    
    const { temperature, waterLevel, deviceId = "unknown" } = body

    // التحقق من صحة البيانات
    if (temperature === undefined || waterLevel === undefined) {
      console.log("خطأ: البيانات غير مكتملة")
      
      const errorResponse = { error: "البيانات غير مكتملة" }
      addLog("POST", "/api/data", body, errorResponse, request.ip)
      
      return NextResponse.json(errorResponse, { status: 400 })
    }

    // التحقق من أن مستوى الماء هو أحد القيم المسموح بها (0، 25، 50، 75، 100)
    const validWaterLevels = [0, 25, 50, 75, 100]
    const normalizedWaterLevel = Number(waterLevel)
    
    if (!validWaterLevels.includes(normalizedWaterLevel)) {
      console.log("خطأ: قيمة مستوى الماء غير صالحة:", normalizedWaterLevel)
      
      const errorResponse = { 
        error: "قيمة مستوى الماء غير صالحة. القيم المسموح بها هي: 0، 25، 50، 75، 100" 
      }
      addLog("POST", "/api/data", body, errorResponse, request.ip)
      
      return NextResponse.json(errorResponse, { status: 400 })
    }

    const timestamp = new Date().toISOString()
    console.log("تحديث البيانات مع الطابع الزمني:", timestamp)

    // تحديث البيانات الحالية للجهاز
    currentData[deviceId] = {
      temperature: Number(temperature),
      waterLevel: normalizedWaterLevel,
      lastUpdate: timestamp,
      deviceId: String(deviceId),
    }

    // إضافة البيانات إلى السجل التاريخي
    historyData.push({
      temperature: Number(temperature),
      waterLevel: normalizedWaterLevel,
      timestamp,
      deviceId: String(deviceId),
    })

    // الاحتفاظ فقط بآخر MAX_HISTORY_LENGTH سجل
    if (historyData.length > MAX_HISTORY_LENGTH) {
      historyData = historyData.slice(-MAX_HISTORY_LENGTH)
    }

    console.log(`تم استلام بيانات جديدة من الجهاز ${deviceId}:`, {
      temperature: Number(temperature),
      waterLevel: normalizedWaterLevel,
      timestamp,
    })
    
    const successResponse = {
      message: "تم استقبال البيانات بنجاح",
      timestamp,
      deviceId,
    }
    
    // إضافة سجل
    addLog("POST", "/api/data", body, successResponse, request.ip)

    return NextResponse.json(successResponse)
  } catch (error) {
    console.error("خطأ في معالجة طلب POST:", error)
    
    const errorResponse = { error: "خطأ في معالجة الطلب" }
    addLog("POST", "/api/data", null, errorResponse, request.ip)
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

/**
 * معالجة طلبات OPTIONS لدعم CORS
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
