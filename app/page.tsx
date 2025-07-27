"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Search,
  Pill,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  AlertCircle,
  Wifi,
  WifiOff,
  ExternalLink,
  Info,
  Phone,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cacheManager } from "@/lib/cache"
import Link from "next/link"
// import DrugDetailsModal from "@/components/drug-details-modal" // Removed
import WebsiteRatingSection from "@/components/website-rating-section"
import { shortageManager, type Shortage } from "@/lib/shortages"

interface Drug {
  id: string
  name: string
  newPrice: number
  oldPrice: number
  no: string
  updateDate: string
  priceChange: number
  priceChangePercent: number
  originalOrder: number
  activeIngredient?: string
  averageDiscountPercent?: number
}

const ITEMS_PER_PAGE = 16

export default function DrugPricingApp() {
  const [drugs, setDrugs] = useState<Drug[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [sortBy, setSortBy] = useState<"original" | "name" | "price" | "change">("original")
  const [lastUpdated, setLastUpdated] = useState<string>("")
  const [isOnline, setIsOnline] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  const [isFromCache, setIsFromCache] = useState(false)
  // const [isModalOpen, setIsModalOpen] = useState(false) // Removed
  // const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null) // Removed
  const [criticalShortagesCount, setCriticalShortagesCount] = useState(0)

  // Check online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Optimized validation function - no console logs, faster processing
  const isValidDrug = (drug: any): boolean => {
    // Quick type and structure checks
    if (!drug || typeof drug !== "object" || !drug.name || typeof drug.name !== "string") {
      return false
    }

    const name = drug.name.trim().toLowerCase()

    // Skip test entries and illegal imports quickly
    if (name === "aaa" || name === "test" || name === "تجربة" || name.includes("illegal import") || name.length < 2) {
      return false
    }

    // Quick price validation - convert and check in one step
    const newPrice = Number.parseFloat(String(drug.newPrice || "0").replace(",", "."))
    const oldPrice = Number.parseFloat(String(drug.oldPrice || "0").replace(",", "."))

    // Must have at least one valid price > 0
    return (newPrice > 0 || oldPrice > 0) && !isNaN(newPrice) && !isNaN(oldPrice)
  }

  // Optimized drug processing
  const processDrug = (drug: any, key: string, index: number): Drug => {
    const name = drug.name.trim()
    const newPrice = Number.parseFloat(String(drug.newPrice || "0").replace(",", ".")) || 0
    const oldPrice = Number.parseFloat(String(drug.oldPrice || "0").replace(",", ".")) || 0

    // Use the valid price if one is missing
    const finalNewPrice = newPrice > 0 ? newPrice : oldPrice
    const finalOldPrice = oldPrice > 0 ? oldPrice : newPrice

    const priceChange = finalNewPrice - finalOldPrice
    const priceChangePercent = finalOldPrice > 0 ? (priceChange / finalOldPrice) * 100 : 0

    return {
      id: key,
      name,
      newPrice: finalNewPrice,
      oldPrice: finalOldPrice,
      no: drug.no?.toString() || key,
      updateDate: drug.updateDate || "",
      priceChange,
      priceChangePercent: Math.round(priceChangePercent * 100) / 100,
      originalOrder: index,
      activeIngredient: drug.activeIngredient || undefined,
      averageDiscountPercent: drug.averageDiscountPercent
        ? Number.parseFloat(String(drug.averageDiscountPercent).replace(",", "."))
        : undefined,
    }
  }

  // Search drug on Google Images
  const searchDrugOnGoogle = (drugName: string) => {
    const searchQuery = encodeURIComponent(`${drugName} دواء صورة`)
    const googleImagesUrl = `https://www.google.com/search?tbm=isch&q=${searchQuery}`
    window.open(googleImagesUrl, "_blank")
  }

  // Optimized fetch function
  const fetchDrugsAndShortages = async (forceRefresh = false) => {
    try {
      // Try cache first
      if (!forceRefresh) {
        const cachedData = cacheManager.get()
        if (cachedData) {
          setDrugs(cachedData.drugs)
          setLastUpdated(cachedData.lastUpdated)
          setIsFromCache(true)
          setLoading(false)

          // Fetch shortages in background
          shortageManager
            .getShortages()
            .then((data) => {
              setCriticalShortagesCount(data.filter((s) => s.status === "critical").length)
            })
            .catch(() => {}) // Silent fail for background task
          return
        }
      }

      setLoading(true)
      setError(null)
      setIsFromCache(false)

      if (!isOnline) {
        throw new Error("لا يوجد اتصال بالإنترنت")
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // Increased timeout

      // Parallel fetch
      const [drugsResponse, shortagesResponse] = await Promise.all([
        fetch("https://dwalast-default-rtdb.firebaseio.com/drugs.json", {
          signal: controller.signal,
          headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
        }),
        fetch("https://dwalast-default-rtdb.firebaseio.com/shortages.json", {
          signal: controller.signal,
          headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
        }).catch(() => null), // Don't fail if shortages fail
      ])

      clearTimeout(timeoutId)

      if (!drugsResponse.ok) {
        if (drugsResponse.status === 404) {
          throw new Error("البيانات غير موجودة في قاعدة البيانات")
        } else if (drugsResponse.status >= 500) {
          throw new Error("خطأ في الخادم، يرجى المحاولة لاحقاً")
        } else {
          throw new Error(`خطأ في التحميل: ${drugsResponse.status}`)
        }
      }

      const drugsData = await drugsResponse.json()
      const shortagesData = shortagesResponse ? await shortagesResponse.json().catch(() => null) : null

      if (!drugsData || typeof drugsData !== "object") {
        throw new Error("لم يتم العثور على بيانات أدوية صحيحة")
      }

      const globalUpdateDate = drugsData.updateDate || ""
      setLastUpdated(globalUpdateDate)

      // Optimized processing - filter and process in one pass
      const drugsArray: Drug[] = []
      const numericKeys = Object.keys(drugsData)
        .filter((key) => !isNaN(Number(key)))
        .sort((a, b) => Number(a) - Number(b))

      let processedCount = 0

      for (let i = 0; i < numericKeys.length; i++) {
        const key = numericKeys[i]
        const drugData = drugsData[key]

        if (isValidDrug(drugData)) {
          try {
            const processedDrug = processDrug(drugData, key, processedCount)
            drugsArray.push(processedDrug)
            processedCount++
          } catch {
            // Silent skip on processing error
            continue
          }
        }
      }

      if (drugsArray.length === 0) {
        throw new Error("لم يتم العثور على بيانات صحيحة")
      }

      setDrugs(drugsArray)
      setRetryCount(0)

      // Process shortages
      if (shortagesData) {
        try {
          const shortagesArray: Shortage[] = Object.values(shortagesData)
          setCriticalShortagesCount(shortagesArray.filter((s) => s.status === "critical").length)
        } catch {
          setCriticalShortagesCount(0)
        }
      } else {
        setCriticalShortagesCount(0)
      }

      // Cache the data
      cacheManager.set(drugsArray, globalUpdateDate)
    } catch (err: any) {
      if (err.name === "AbortError") {
        setError("انتهت مهلة الاتصال، يرجى المحاولة مرة أخرى")
      } else if (!isOnline) {
        setError("لا يوجد اتصال بالإنترنت، يرجى التحقق من الاتصال")
      } else {
        setError(err.message || "فشل في تحميل البيانات")
      }

      if (retryCount < 2 && isOnline) {
        // Reduced retry attempts
        setTimeout(
          () => {
            setRetryCount((prev) => prev + 1)
            fetchDrugsAndShortages(true)
          },
          3000 * (retryCount + 1),
        )
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDrugsAndShortages()
  }, [])

  // Optimized filtering and sorting with useMemo
  const filteredAndSortedDrugs = useMemo(() => {
    if (!searchTerm && sortBy === "original") {
      return drugs // Return original array if no filtering/sorting needed
    }

    let filtered = drugs

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = drugs.filter(
        (drug) => drug.name.toLowerCase().includes(searchLower) || drug.no.toLowerCase().includes(searchLower),
      )
    }

    if (sortBy !== "original") {
      filtered = [...filtered].sort((a, b) => {
        switch (sortBy) {
          case "price":
            return a.newPrice - b.newPrice
          case "change":
            return Math.abs(b.priceChangePercent) - Math.abs(a.priceChangePercent)
          case "name":
            return a.name.localeCompare(b.name, "ar")
          default:
            return a.originalOrder - b.originalOrder
        }
      })
    }

    return filtered
  }, [drugs, searchTerm, sortBy])

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedDrugs.length / ITEMS_PER_PAGE)
  const paginatedDrugs = useMemo(
    () => filteredAndSortedDrugs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [filteredAndSortedDrugs, currentPage],
  )

  const formatPrice = (price: number) => {
    return isNaN(price) ? "0.00 جنيه" : `${price.toFixed(2)} جنيه`
  }

  const getPriceChangeColor = (change: number) => {
    if (change > 0) return "text-red-600 bg-red-50 border-red-200"
    if (change < 0) return "text-green-600 bg-green-50 border-green-200"
    return "text-gray-600 bg-gray-50 border-gray-200"
  }

  const handleDrugCardClick = (drug: Drug) => {
    // Removed rating modal functionality - no action on click
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-pulse">
                <Pill className="h-8 w-8 text-white" />
              </div>
              <Skeleton className="h-12 w-96" />
            </div>
            <Skeleton className="h-6 w-64 mx-auto" />
            <div className="mt-4 text-blue-600">جاري تحميل البيانات...</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 16 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <Skeleton className="h-5 w-full mb-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-20 mb-3" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <header className="mb-6 bg-gradient-to-r from-blue-600 to-purple-700 text-white rounded-lg p-4 shadow-xl">
          <div className="flex flex-col items-center justify-center gap-2 mb-4">
            <Pill className="h-10 w-10 text-white" />
            <span className="font-bold text-2xl text-white">دليل الأدوية</span>
          </div>

          <nav className="flex gap-2 flex-wrap justify-center">
            <Link href="/about">
              <Button
                variant="outline"
                size="sm"
                className="border-white/50 text-white hover:bg-white/20 hover:text-white bg-transparent"
              >
                <Info className="h-4 w-4 ml-2 text-white" />
                عن الموقع
              </Button>
            </Link>
            <Link href="/contact">
              <Button
                variant="outline"
                size="sm"
                className="border-white/50 text-white hover:bg-white/20 hover:text-white bg-transparent"
              >
                <Phone className="h-4 w-4 ml-2 text-white" />
                تواصل معنا
              </Button>
            </Link>
            <Link href="/shortages">
              <Button
                variant="outline"
                size="sm"
                className="border-white/50 text-white hover:bg-white/20 hover:text-white bg-transparent relative"
              >
                <Pill className="h-4 w-4 ml-2 text-white" />
                نواقص الأدوية
                {criticalShortagesCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center rounded-full p-0 text-xs animate-bounce"
                  >
                    {criticalShortagesCount}
                  </Badge>
                )}
              </Button>
            </Link>
          </nav>
        </header>

        {/* Title */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full">
              <Pill className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              أسعار الأدوية المصرية
            </h1>
          </div>
          <p className="text-gray-600 text-lg">معلومات الأسعار المحدثة للأدوية في مصر</p>

          <div className="flex items-center justify-center gap-4 mt-4">
            {lastUpdated && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                آخر تحديث: {lastUpdated}
              </Badge>
            )}
            {isFromCache && (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                من الذاكرة المؤقتة
              </Badge>
            )}
            <Badge
              variant="outline"
              className={`${isOnline ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}
            >
              {isOnline ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
              {isOnline ? "متصل" : "غير متصل"}
            </Badge>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
              {retryCount > 0 && <span className="block mt-2 text-sm">محاولة إعادة التحميل ({retryCount}/2)...</span>}
            </AlertDescription>
          </Alert>
        )}

        {/* Controls */}
        <Card className="mb-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="البحث بالاسم أو رقم الدواء..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="pl-10 border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                    dir="rtl"
                  />
                </div>
              </div>

              <Select
                value={sortBy}
                onValueChange={(value: "original" | "name" | "price" | "change") => setSortBy(value)}
              >
                <SelectTrigger className="w-48 border-gray-200 focus:border-blue-400 focus:ring-blue-400">
                  <SelectValue placeholder="ترتيب حسب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="original">الترتيب الأصلي</SelectItem>
                  <SelectItem value="name">الاسم أ-ي</SelectItem>
                  <SelectItem value="price">السعر من الأقل</SelectItem>
                  <SelectItem value="change">تغيير السعر</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={() => {
                  cacheManager.clear()
                  fetchDrugsAndShortages(true)
                }}
                variant="outline"
                size="sm"
                className="border-gray-200 hover:bg-blue-50 bg-transparent"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                تحديث
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-gray-600 font-medium">{filteredAndSortedDrugs.length} دواء موجود</p>
          {totalPages > 1 && (
            <div className="text-sm text-gray-500">
              صفحة {currentPage} من {totalPages}
            </div>
          )}
        </div>

        {/* Drug Grid */}
        {paginatedDrugs.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Pill className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">لا توجد أدوية</h3>
              <p className="text-gray-500">جرب تعديل كلمات البحث</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
            {paginatedDrugs.map((drug) => (
              <Card
                key={drug.id}
                className="overflow-hidden hover:shadow-lg transition-all duration-200 border-0 bg-white/90 backdrop-blur-sm group hover:scale-[1.02] cursor-pointer"
                onClick={() => handleDrugCardClick(drug)}
              >
                <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-purple-50 group-hover:from-blue-100 group-hover:to-purple-100 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base font-semibold text-gray-800 line-clamp-2 leading-tight" dir="rtl">
                        {drug.name}
                      </CardTitle>
                      <div className="text-xs text-gray-500 mt-1">رقم الدواء: {drug.no}</div>
                    </div>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        searchDrugOnGoogle(drug.name)
                      }}
                      variant="ghost"
                      size="sm"
                      className="p-2 h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                      title="البحث عن صورة الدواء في جوجل"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xl font-bold text-blue-600">{formatPrice(drug.newPrice)}</div>
                    <div className="flex items-center gap-2">
                      {drug.priceChange !== 0 && (
                        <Badge
                          variant="outline"
                          className={`text-xs px-2 py-1 ${getPriceChangeColor(drug.priceChange)}`}
                        >
                          {drug.priceChange > 0 ? (
                            <TrendingUp className="h-3 w-3 ml-1" />
                          ) : (
                            <TrendingDown className="h-3 w-3 ml-1" />
                          )}
                          {drug.priceChangePercent > 0 ? "+" : ""}
                          {drug.priceChangePercent.toFixed(1)}%
                        </Badge>
                      )}
                      {drug.averageDiscountPercent !== undefined && drug.averageDiscountPercent > 0 && (
                        <Badge
                          variant="outline"
                          className="text-purple-600 bg-purple-50 border-purple-200 text-xs px-2 py-1"
                        >
                          خصم: {drug.averageDiscountPercent.toFixed(1)}%
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1 text-sm" dir="rtl">
                    <div className="flex justify-between text-gray-600">
                      <span>السعر السابق:</span>
                      <span className="font-medium">{formatPrice(drug.oldPrice)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>التغيير:</span>
                      <span className={`font-medium ${drug.priceChange >= 0 ? "text-red-600" : "text-green-600"}`}>
                        {drug.priceChange >= 0 ? "+" : ""}
                        {formatPrice(drug.priceChange)}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-gray-400 mt-3 pt-2 border-t border-gray-100" dir="rtl">
                    تحديث: {drug.updateDate}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="border-gray-200 hover:bg-blue-50"
            >
              السابق
            </Button>

            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-10 h-10 ${
                      currentPage === pageNum ? "bg-blue-600 hover:bg-blue-700" : "border-gray-200 hover:bg-blue-50"
                    }`}
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>

            <Button
              variant="outline"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="border-gray-200 hover:bg-blue-50"
            >
              التالي
            </Button>
          </div>
        )}

        {/* Website Rating Section */}
        <WebsiteRatingSection />

        {/* Drug Details Modal - Removed */}
      </div>
    </div>
  )
}
