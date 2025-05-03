"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCcw, Send, AlertTriangle } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function DebugPage() {
  const [serverData, setServerData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [clientTime, setClientTime] = useState<Date>(new Date())
  const [testData, setTestData] = useState({
    temperature: 25,
    waterLevel: 75,
    deviceId: "ESP8266MOD"
  })
  const [testResponse, setTestResponse] = useState<any>(null)
  const [testLoading, setTestLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const fetchDebugData = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios.get("/api/debug")
      setServerData(response.data)
      setClientTime(new Date())
    } catch (error) {
      console.error("خطأ في جلب بيانات التشخيص:", error)
      setError("حدث خطأ أثناء جلب بيانات التشخيص")
    } finally {
      setLoading(false)
    }
  }
  
  const sendTestData = async () => {
    setTestLoading(true)
    setError(null)
    try {
      const response = await axios.post("/api/data", testData)
      setTestResponse(response.data)
      
      // تحديث البيانات بعد إرسال بيانات الاختبار
      fetchDebugData()
    } catch (error) {
      console.error("خطأ في إرسال بيانات الاختبار:", error)
      setError("حدث خطأ أثناء إرسال بيانات الاختبار")
    } finally {
      setTestLoading(false)
    }
  }
  
  useEffect(() => {
    fetchDebugData()
    
    // تحديث الوقت كل ثانية
    const interval = setInterval(() => {
      setClientTime(new Date())
    }, 1000)
    
    return () => clearInterval(interval)
  }, [])
  
  // حساب الفرق الزمني بين آخر تحديث والوقت الحالي
  const calculateTimeDifference = (lastUpdateStr: string) => {
    if (!lastUpdateStr) return "غير متوفر"
    
    const lastUpdate = new Date(lastUpdateStr)
    const now = new Date()
    const diffSeconds = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000)
    
    if (diffSeconds < 60) return `${diffSeconds} ثانية`
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} دقيقة`
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} ساعة`
    return `${Math.floor(diffSeconds / 86400)} يوم`
  }
  
  // تحديد حالة الاتصال بناءً على الوقت المنقضي
  const getConnectionStatus = (lastUpdateStr: string) => {
    if (!lastUpdateStr) return "غير متصل"
    
    const lastUpdate = new Date(lastUpdateStr)
    const now = new Date()
    const diffSeconds = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000)
    
    if (diffSeconds < 60) return "متصل"
    if (diffSeconds < 300) return "نشط"
    if (diffSeconds < 1800) return "غير نشط"
    return "غير متصل"
  }
  
  // تحديد لون حالة الاتصال
  const getStatusColor = (status: string) => {
    switch (status) {
      case "متصل": return "bg-green-500"
      case "نشط": return "bg-yellow-500"
      case "غير نشط": return "bg-orange-500"
      default: return "bg-red-500"
    }
  }
  
  return (
    <div className="container mx-auto p-4 rtl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">صفحة تشخيص النظام</h1>
        <div className="flex gap-2">
          <Button onClick={fetchDebugData} disabled={loading} variant="outline">
            <RefreshCcw className={`ml-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </Button>
        </div>
      </div>
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>خطأ</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Tabs defaultValue="status" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="status">حالة النظام</TabsTrigger>
          <TabsTrigger value="devices">الأجهزة</TabsTrigger>
          <TabsTrigger value="history">السجل التاريخي</TabsTrigger>
          <TabsTrigger value="test">اختبار النظام</TabsTrigger>
        </TabsList>
        
        <TabsContent value="status">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>معلومات الوقت</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <span className="font-bold">وقت المتصفح:</span> {clientTime.toLocaleString()}
                  </div>
                  {serverData?.serverTime && (
                    <div>
                      <span className="font-bold">وقت الخادم:</span> {new Date(serverData.serverTime).toLocaleString()}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>إحصائيات النظام</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <span className="font-bold">عدد الأجهزة:</span> {serverData?.currentData ? Object.keys(serverData.currentData).length : 0}
                  </div>
                  <div>
                    <span className="font-bold">عدد السجلات التاريخية:</span> {serverData?.historyCount || 0}
                  </div>
                  <div>
                    <span className="font-bold">عدد سجلات الطلبات:</span> {serverData?.requestLogsCount || 0}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>سجل الطلبات الأخيرة</CardTitle>
              </CardHeader>
              <CardContent>
                {serverData?.requestLogs && serverData.requestLogs.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الوقت</th>
                          <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الطريقة</th>
                          <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المسار</th>
                          <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">عنوان IP</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {serverData.requestLogs.map((log: any, index: number) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(log.timestamp).toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.method}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.path}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.ip || "غير معروف"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p>لا توجد سجلات طلبات متاحة</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="devices">
          <Card>
            <CardHeader>
              <CardTitle>الأجهزة المتصلة</CardTitle>
            </CardHeader>
            <CardContent>
              {serverData?.currentData && Object.keys(serverData.currentData).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(serverData.currentData).map(([deviceId, data]: [string, any]) => {
                    const status = getConnectionStatus(data.lastUpdate);
                    return (
                      <div key={deviceId} className="border p-4 rounded-lg">
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${getStatusColor(status)}`}></div>
                            <h3 className="text-lg font-semibold">{deviceId}</h3>
                          </div>
                          <span className={`px-2 py-1 rounded text-white ${getStatusColor(status)}`}>
                            {status}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <span className="font-bold">درجة الحرارة:</span> {data.temperature}°C
                          </div>
                          <div>
                            <span className="font-bold">مستوى الماء:</span> {data.waterLevel}%
                          </div>
                          <div>
                            <span className="font-bold">آخر تحديث:</span> {new Date(data.lastUpdate).toLocaleString()}
                          </div>
                          <div>
                            <span className="font-bold">الوقت منذ آخر تحديث:</span> {calculateTimeDifference(data.lastUpdate)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p>لا توجد أجهزة متصلة</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>البيانات التاريخية</CardTitle>
            </CardHeader>
            <CardContent>
              {serverData?.historyData && serverData.historyData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الوقت</th>
                        <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الجهاز</th>
                        <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">درجة الحرارة</th>
                        <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">مستوى الماء</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {serverData.historyData.map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(item.timestamp).toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.deviceId}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.temperature}°C</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.waterLevel}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>لا توجد بيانات تاريخية متاحة</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="test">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  
                  <Button onClick={sendTestData} disabled={testLoading} className="w-full">
                    <Send className={`ml-2 h-4 w-4 ${testLoading ? "animate-spin" : ""}`} />
                    إرسال بيانات الاختبار
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>استجابة الاختبار</CardTitle>
              </CardHeader>
              <CardContent>
                {testResponse ? (
                  <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto">
                    {JSON.stringify(testResponse, null, 2)}
                  </pre>
                ) : (
                  <p>لم يتم إرسال أي بيانات اختبار بعد</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
