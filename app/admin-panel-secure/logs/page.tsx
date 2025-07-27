"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RefreshCw, Clock, User, Activity, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { dataManager } from "@/lib/data-management"

interface LogEntry {
  id: string
  timestamp: number
  action: string
  details: string
  adminEmail: string
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLogs = async () => {
    try {
      setLoading(true)
      setError(null)
      const logsData = await dataManager.getLogs()
      setLogs(logsData)
    } catch (err) {
      setError("Failed to fetch logs")
      console.error("Error fetching logs:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'import_from_file':
      case 'import_from_url':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'delete_all_data':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'restore_data':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'import_from_file':
      case 'import_from_url':
        return '📥'
      case 'delete_all_data':
        return '🗑️'
      case 'restore_data':
        return '🔄'
      default:
        return '📝'
    }
  }

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'import_from_file':
        return 'استيراد من ملف'
      case 'import_from_url':
        return 'استيراد من رابط'
      case 'delete_all_data':
        return 'حذف جميع البيانات'
      case 'restore_data':
        return 'استعادة البيانات'
      default:
        return action
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">جاري تحميل السجلات...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/admin-panel-secure">
            <Button variant="outline" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              العودة للوحة التحكم
            </Button>
          </Link>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full">
                <Activity className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">سجلات الموقع</h1>
                <p className="text-gray-600">مراقبة نشاطات الموقع والإدارة</p>
              </div>
            </div>
            
            <Button onClick={fetchLogs} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              تحديث
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">إجمالي السجلات</p>
                  <p className="text-2xl font-bold text-gray-800">{logs.length}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">آخر نشاط</p>
                  <p className="text-sm font-medium text-gray-800">
                    {logs.length > 0 ? formatTimestamp(logs[0].timestamp) : 'لا يوجد'}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">المديرين النشطين</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {new Set(logs.map(log => log.adminEmail)).size}
                  </p>
                </div>
                <User className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Logs List */}
        {logs.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Activity className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">لا توجد سجلات</h3>
              <p className="text-gray-500">لم يتم تسجيل أي نشاطات بعد</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => (
              <Card key={log.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="text-2xl">{getActionIcon(log.action)}</div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className={getActionColor(log.action)}>
                            {getActionLabel(log.action)}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {formatTimestamp(log.timestamp)}
                          </span>
                        </div>
                        
                        <p className="text-gray-800 mb-2">{log.details}</p>
                        
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <User className="h-4 w-4" />
                          <span>{log.adminEmail}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}