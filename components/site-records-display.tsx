"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Database, 
  TrendingUp, 
  Users, 
  Star, 
  AlertTriangle, 
  RefreshCw,
  Calendar,
  Clock,
  Shield,
  FileText
} from "lucide-react"
import { localDataManager } from "@/lib/local-data"

interface SiteRecordsProps {
  drugs: any[]
  shortages: any[]
  ratings: any[]
  lastUpdated?: string
}

export default function SiteRecordsDisplay({ drugs, shortages, ratings, lastUpdated }: SiteRecordsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState<any>(null)

  const calculateStats = () => {
    setIsLoading(true)
    
    // Calculate various statistics
    const totalDrugs = drugs.length
    const totalShortages = shortages.length
    const totalRatings = ratings.length
    
    const averagePrice = drugs.length > 0 
      ? drugs.reduce((sum: number, drug: any) => sum + drug.newPrice, 0) / drugs.length 
      : 0
    
    const priceChanges = drugs.map((drug: any) => drug.newPrice - drug.oldPrice)
    const priceIncreases = priceChanges.filter((change: number) => change > 0).length
    const priceDecreases = priceChanges.filter((change: number) => change < 0).length
    
    const criticalShortages = shortages.filter((shortage: any) => shortage.status === "critical").length
    
    const today = new Date().toLocaleDateString("ar-EG")
    const updatedToday = drugs.filter((drug: any) => drug.updateDate === today).length
    
    const localStats = localDataManager.getStats()
    
    setStats({
      totalDrugs,
      totalShortages,
      totalRatings,
      averagePrice,
      priceIncreases,
      priceDecreases,
      criticalShortages,
      updatedToday,
      lastUpdated: localStats?.lastUpdated || lastUpdated,
      version: localStats?.version || "غير محدد"
    })
    
    setIsLoading(false)
  }

  useEffect(() => {
    calculateStats()
  }, [drugs, shortages, ratings])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">جاري حساب الإحصائيات...</span>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center p-8 text-gray-500">
        <Database className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>لا توجد بيانات متاحة</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">سجلات الموقع</h2>
        <p className="text-gray-600">إحصائيات شاملة لجميع البيانات</p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">إجمالي الأدوية</p>
                <p className="text-2xl font-bold">{stats.totalDrugs}</p>
              </div>
              <Database className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">متوسط السعر</p>
                <p className="text-2xl font-bold">{stats.averagePrice.toFixed(2)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">النواقص الحرجة</p>
                <p className="text-2xl font-bold">{stats.criticalShortages}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">التقييمات</p>
                <p className="text-2xl font-bold">{stats.totalRatings}</p>
              </div>
              <Star className="h-8 w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              إحصائيات الأسعار
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">الزيادات في الأسعار:</span>
              <Badge variant="outline" className="text-red-600 bg-red-50">
                {stats.priceIncreases}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">الانخفاضات في الأسعار:</span>
              <Badge variant="outline" className="text-green-600 bg-green-50">
                {stats.priceDecreases}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">المحدثة اليوم:</span>
              <Badge variant="outline" className="text-blue-600 bg-blue-50">
                {stats.updatedToday}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              معلومات النظام
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">آخر تحديث:</span>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm">
                  {stats.lastUpdated 
                    ? new Date(stats.lastUpdated).toLocaleDateString("ar-EG")
                    : "غير محدد"
                  }
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">إصدار البيانات:</span>
              <Badge variant="outline">{stats.version}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">حالة الأمان:</span>
              <div className="flex items-center gap-1 text-green-600">
                <Shield className="h-4 w-4" />
                <span className="text-sm">مؤمن</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-center">
        <Button 
          onClick={calculateStats}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <RefreshCw className={`ml-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          تحديث الإحصائيات
        </Button>
      </div>
    </div>
  )
}