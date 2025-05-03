"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { RefreshCcw, AlertTriangle, Droplets, Thermometer, Clock, Cpu, Download, BarChart3, Settings, Info, Send } from 'lucide-react'
import { useTheme } from "next-themes"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { DashboardHeader } from "@/components/dashboard-header"
import { TemperatureGauge } from "@/components/temperature-gauge"
import { WaterLevelGauge } from "@/components/water-level-gauge"
import { TemperatureChart } from "@/components/temperature-chart"
import { WaterLevelChart } from "@/components/water-level-chart"
import { DeviceStatus } from "@/components/device-status"
import { DataTable } from "@/components/data-table"
import { ApiDocs } from "@/components/api-docs"
import { StatusIndicator } from "@/components/status-indicator"
import Link from "next/link"

// تعريف نوع البيانات
interface DataPoint {
  temperature: number
  waterLevel: number
  timestamp: string
  deviceId: string
}

interface ApiResponse {
  current: {
    temperature: number
    waterLevel: number
    lastUpdate: string
    deviceId: string
  } | Array<{
    temperature: number
    waterLevel: number
    lastUpdate: string
    deviceId: string
  }>
  history: DataPoint[]
}

export default function Home() {
  const [currentData, setCurrentData] = useState({
    temperature: 0,
    waterLevel: 0,
    lastUpdate: "",
    deviceId: "غير معروف",
  })
  const [allDevices, setAllDevices] = useState<Array<{
    temperature: number
    waterLevel: number
    lastUpdate: string
    deviceId: string
  }>>([])
  const [history, setHistory] = useState<DataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const { theme } = useTheme()
  const [testData, setTestData] = useState({
    temperature: 25,
    waterLevel: 75,
    deviceId: "ESP8266MOD"
  })

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      console.log("جاري جلب البيانات...")
      const response = await axios.get<ApiResponse>("/api/data")
      console.log("البيانات المستلمة:", response.data)

      // التحقق من وجود البيانات قبل تحديث الحالة
      if (response.data && response.data.current) {
        if (Array.isArray(response.data.current)) {
          // إذا كان هناك عدة أجهزة
          setAllDevices(response.data.current)
          
          // استخدام أول جهاز كجهاز افتراضي للعرض
          if (response.data.current.length > 0) {
            setCurrentData({
              temperature: response.data.current[0].temperature || 0,
              waterLevel: response.data.current[0].waterLevel || 0,
              lastUpdate: response.data.current[0].lastUpdate || "",
              deviceId: response.data.current[0].deviceId || "غير معروف",
            })
          }
        } else {
          // إذا كان هناك جهاز واحد فقط
          setCurrentData({
            temperature: response.data.current.temperature || 0,
            waterLevel: response.data.current.waterLevel || 0,
            lastUpdate: response.data.current.lastUpdate || "",
            deviceId: response.data.current.deviceId || "غير معروف",
          })
          setAllDevices([response.data.current])
        }
      }

      // التحقق من وجود البيانات التاريخية
      if (response.data && Array.isArray(response.data.history)) {
        setHistory(response.data.history)
      }

      setLastRefresh(new Date())
    } catch (err) {
      console.error("خطأ في جلب البيانات:", err)
      setError("حدث خطأ أثناء جلب البيانات. يرجى المحاولة مرة أخرى.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // لا يوجد تحديث تلقائي - يتم التحديث فقط عند النقر على زر التحديث
  }, [])

  // تنسيق التاريخ بالعربية
  const formatDate = (dateString: string) => {
    if (!dateString) return "غير متوفر"
    try {
      const date = new Date(dateString)
      return new Intl.DateTimeFormat("ar-SA", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
      }).format(date)
    } catch (err) {
      return "غير متوفر"
    }
  }

  // تحديد حالة الجهاز بناءً على آخر تحديث
  const getDeviceStatus = () => {
    if (!currentData.lastUpdate) return "غير متصل"

    const lastUpdate = new Date(currentData.lastUpdate)
    const now = new Date()
    const diffMinutes = (now.getTime() - lastUpdate.getTime()) / (1000 * 60)

    if (diffMinutes < 1) return "متصل"
    if (diffMinutes < 5) return "نشط"
    if (diffMinutes < 30) return "غير نشط"
    return "غير متصل"
  }

  const deviceStatus = getDeviceStatus()

  // تصدير البيانات كملف CSV
  const exportToCSV = () => {
    if (history.length === 0) return

    const headers = "التاريخ,درجة الحرارة,مستوى الماء,معرف الجهاز\n"
    const csvContent =
      headers +
      history.map((item) => `${item.timestamp},${item.temperature},${item.waterLevel},${item.deviceId}`).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)

    link.setAttribute("href", url)
    link.setAttribute("download", `بيانات_المراقبة_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
  
  // إرسال بيانات اختبار
  const sendTestData = async () => {
    try {
      setLoading(true);
      
      const response = await axios.post("/api/data", testData);
      console.log("استجابة اختبار API:", response.data);
      
      // تحديث البيانات بعد إرسال بيانات الاختبار
      fetchData();
      
      alert("تم إرسال بيانات الاختبار بنجاح!");
    } catch (error) {
      console.error("خطأ في إرسال بيانات الاختبار:", error);
      setError("حدث خطأ أثناء إرسال بيانات الاختبار.");
    } finally {
      setLoading(false);
    }
  };

  // تغيير الجهاز الحالي
  const changeCurrentDevice = (deviceId: string) => {
    const device = allDevices.find(d => d.deviceId === deviceId);
    if (device) {
      setCurrentData(device);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 dark:from-slate-900 dark:to-slate-800 rtl">
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <DashboardHeader />

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>خطأ</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <DeviceStatus status={deviceStatus} deviceId={currentData.deviceId} />

            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Clock className="h-4 w-4" />
              <span>آخر تحديث:</span>
              <span>{formatDate(currentData.lastUpdate)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <StatusIndicator status={loading ? "loading" : "idle"} />
            <Button onClick={fetchData} disabled={loading} variant="outline" className="flex items-center gap-2">
              <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              تحديث البيانات
            </Button>
            <Button
              onClick={exportToCSV}
              disabled={history.length === 0}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              تصدير البيانات
            </Button>
            <Link href="/debug">
              <Button variant="outline" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                التشخيص
              </Button>
            </Link>
          </div>
        </div>

        {allDevices.length > 1 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">اختر الجهاز:</h3>
            <div className="flex flex-wrap gap-2">
              {allDevices.map((device) => (
                <Button
                  key={device.deviceId}
                  variant={currentData.deviceId === device.deviceId ? "default" : "outline"}
                  onClick={() => changeCurrentDevice(device.deviceId)}
                >
                  {device.deviceId}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="overflow-hidden">
            <CardContent className="p-6">
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-1/3" />
                  <Skeleton className="h-40 w-full" />
                </div>
              ) : (
                <TemperatureGauge temperature={currentData.temperature} />
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardContent className="p-6">
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-1/3" />
                  <Skeleton className="h-40 w-full" />
                </div>
              ) : (
                <WaterLevelGauge waterLevel={currentData.waterLevel} />
              )}
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="charts" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="charts" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">الرسوم البيانية</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">سجل القراءات</span>
            </TabsTrigger>
            <TabsTrigger value="devices" className="flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              <span className="hidden sm:inline">الأجهزة</span>
            </TabsTrigger>
            <TabsTrigger value="test" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">اختبار</span>
            </TabsTrigger>
            <TabsTrigger value="api" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">واجهة API</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="charts" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="pt-6">
                  {loading ? <Skeleton className="h-64 w-full" /> : <TemperatureChart data={history || []} />}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  {loading ? <Skeleton className="h-64 w-full" /> : <WaterLevelChart data={history || []} />}
                </CardContent>
              </Card>
            </div>

            {history.length === 0 && !loading && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>لا توجد بيانات كافية</AlertTitle>
                <AlertDescription>
                  لم يتم تسجيل أي قراءات بعد. سيتم عرض الرسوم البيانية بمجرد توفر البيانات.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardContent className="pt-6">
                {loading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : (
                  <DataTable data={history || []} formatDate={formatDate} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="devices">
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-xl font-bold mb-4">الأجهزة المتصلة</h3>

                {loading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {allDevices.map((device) => (
                      <div key={device.deviceId} className="p-4 border rounded-lg bg-white dark:bg-slate-800">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-3 h-3 rounded-full ${
                                getDeviceStatus() === "متصل"
                                  ? "bg-green-500"
                                  : getDeviceStatus() === "نشط"
                                    ? "bg-yellow-500"
                                    : "bg-red-500"
                              }`}
                            ></div>
                            <div>
                              <h4 className="font-medium">{device.deviceId}</h4>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                آخر تحديث: {formatDate(device.lastUpdate)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Thermometer className="h-4 w-4 text-red-500" />
                              <span>{device.temperature}°C</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Droplets className="h-4 w-4 text-blue-500" />
                              <span>{device.waterLevel}%</span>
                            </div>
                            <Badge
                              variant={
                                getDeviceStatus() === "متصل" ? "default" : getDeviceStatus() === "نشط" ? "outline" : "secondary"
                              }
                            >
                              {getDeviceStatus()}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}

                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle>معلومات</AlertTitle>
                      <AlertDescription>
                        يمكنك إضافة المزيد من الأجهزة عن طريق استخدام نفس واجهة API مع تغيير معرف الجهاز (deviceId).
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="test">
            <Card>
              <CardHeader>
                <CardTitle>إرسال بيانات اختبار</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">درجة الحرارة</label>
                    <input
                      type="number"
                      value={testData.temperature}
                      onChange={(e) => setTestData({...testData, temperature: Number(e.target.value)})}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">مستوى الماء</label>
                    <select
                      value={testData.waterLevel}
                      onChange={(e) => setTestData({...testData, waterLevel: Number(e.target.value)})}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value={0}>0%</option>
                      <option value={25}>25%</option>
                      <option value={50}>50%</option>
                      <option value={75}>75%</option>
                      <option value={100}>100%</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">معرف الجهاز</label>
                    <input
                      type="text"
                      value={testData.deviceId}
                      onChange={(e) => setTestData({...testData, deviceId: e.target.value})}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <Button onClick={sendTestData} disabled={loading} className="w-full">
                    <Send className={`ml-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    إرسال بيانات الاختبار
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="api">
            <ApiDocs />
          </TabsContent>
        </Tabs>

        {lastRefresh && (
          <div className="text-center text-xs text-gray-500 dark:text-gray-400 mt-8">
            تم تحديث البيانات في {lastRefresh.toLocaleTimeString("ar-SA")}
          </div>
        )}
      </div>
    </main>
  )
}
