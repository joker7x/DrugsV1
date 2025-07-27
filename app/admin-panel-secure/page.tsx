"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  Shield,
  Eye,
  EyeOff,
  LogIn,
  LogOut,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Search,
  TrendingUp,
  Users,
  Database,
  RefreshCw,
  FileText,
  ChevronLeft,
  ChevronRight,
  Star,
  Verified,
  FlaskRoundIcon as Flask,
  User,
  AlertTriangle,
  Activity,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select" // For shortage status
import {
  getAllProductRatingsForAdmin,
  getWebsiteRatings,
  deleteRating,
  updateRating,
  type ProductRating,
  type WebsiteRating,
} from "@/lib/ratings"
import { authManager } from "@/lib/auth"
import { cacheManager } from "@/lib/cache"
import { shortageManager, type Shortage } from "@/lib/shortages" // Import shortage manager
import { dataManager } from "@/lib/data-management" // Import data manager
import Link from "next/link"

interface Drug {
  id: string
  name: string
  newPrice: number
  oldPrice: number
  no: string
  updateDate: string
  activeIngredient?: string
  averageDiscountPercent?: number
}

interface AboutPageContent {
  title: string
  intro: string
  missionTitle: string
  missionText: string
  teamIntro: string
  teamMedical: string
  teamDev: string
}

interface ContactPageContent {
  title: string
  intro: string
  email1: string
  email2: string
  phone1: string
  phone2: string
  address1: string
  address2: string
  workHours1: string
  workHours2: string
  responseTitle: string
  responseText: string
}

const ADMIN_ITEMS_PER_PAGE = 10 // For admin panel drug list

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loginData, setLoginData] = useState({ email: "", password: "" })
  const [showPassword, setShowPassword] = useState(false)
  const [loginError, setLoginError] = useState("")
  const [drugs, setDrugs] = useState<Drug[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [editingDrug, setEditingDrug] = useState<Drug | null>(null)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [newDrug, setNewDrug] = useState({
    name: "",
    newPrice: "",
    oldPrice: "",
    no: "",
    activeIngredient: "",
    averageDiscountPercent: "",
  })
  const [saveMessage, setSaveMessage] = useState("")
  const [activeTab, setActiveTab] = useState("drugs") // 'drugs' or 'pages' or 'ratings'

  // Pagination for admin drug list
  const [adminCurrentPage, setAdminCurrentPage] = useState(1)

  // Page Content States
  const [aboutContent, setAboutContent] = useState<AboutPageContent>({
    title: "",
    intro: "",
    missionTitle: "",
    missionText: "",
    teamIntro: "",
    teamMedical: "",
    teamDev: "",
  })
  const [contactContent, setContactContent] = useState<ContactPageContent>({
    title: "",
    intro: "",
    email1: "",
    email2: "",
    phone1: "",
    phone2: "",
    address1: "",
    address2: "",
    workHours1: "",
    workHours2: "",
    responseTitle: "",
    responseText: "",
  })
  const [pageContentLoading, setPageContentLoading] = useState(false)
  const [pageSaveMessage, setPageSaveMessage] = useState("")

  // Ratings Management States
  const [productRatings, setProductRatings] = useState<ProductRating[]>([])
  const [websiteRatings, setWebsiteRatings] = useState<WebsiteRating[]>([])
  const [ratingsManagementLoading, setRatingsManagementLoading] = useState(false)
  const [ratingsMessage, setRatingsMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Shortages Management States
  const [shortages, setShortages] = useState<Shortage[]>([])
  const [shortagesLoading, setShortagesLoading] = useState(false)
  const [shortageMessage, setShortageMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [isAddingNewShortage, setIsAddingNewShortage] = useState(false)
  const [editingShortage, setEditingShortage] = useState<Shortage | null>(null)
  const [newShortage, setNewShortage] = useState({
    drugName: "", // Changed from drugId to drugName
    reason: "",
    status: "moderate" as "critical" | "moderate" | "resolved",
  })
  const [shortageSearchTerm, setShortageSearchTerm] = useState("")

  // Data Management States
  const [dataManagementLoading, setDataManagementLoading] = useState(false)
  const [dataManagementMessage, setDataManagementMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [importUrl, setImportUrl] = useState("")
  const [backups, setBackups] = useState<string[]>([])
  const [selectedBackup, setSelectedBackup] = useState("")

  useEffect(() => {
    setIsAuthenticated(authManager.isAuthenticated())
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      fetchDrugs()
      fetchPageContent()
      fetchRatings() // Fetch ratings when authenticated
      fetchShortages() // Fetch shortages when authenticated
      fetchBackups() // Fetch backups when authenticated
    }
  }, [isAuthenticated])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError("")

    if (authManager.login(loginData.email, loginData.password)) {
      setIsAuthenticated(true)
      setLoginData({ email: "", password: "" })
    } else {
      setLoginError("بيانات تسجيل الدخول غير صحيحة")
    }
  }

  const handleLogout = () => {
    authManager.logout()
    setIsAuthenticated(false)
    setDrugs([])
    cacheManager.clear() // Clear client-side cache on logout
  }

  const fetchDrugs = async () => {
    setLoading(true)
    try {
      const response = await fetch("https://dwalast-default-rtdb.firebaseio.com/drugs.json")
      if (!response.ok) throw new Error("فشل في تحميل البيانات")

      const data = await response.json()
      if (data) {
        const drugsArray = Object.entries(data)
          .filter(([key]) => !isNaN(Number(key)))
          .map(([key, drug]: [string, any]) => ({
            id: key,
            name: drug.name || "",
            newPrice: Number.parseFloat(drug.newPrice) || 0,
            oldPrice: Number.parseFloat(drug.oldPrice) || 0,
            no: drug.no || key,
            updateDate: drug.updateDate || "",
            activeIngredient: drug.activeIngredient || "",
            averageDiscountPercent: drug.averageDiscountPercent
              ? Number.parseFloat(drug.averageDiscountPercent)
              : undefined,
          }))
          .sort((a, b) => Number(a.id) - Number(b.id))

        setDrugs(drugsArray)
      }
    } catch (error) {
      console.error("Error fetching drugs:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPageContent = async () => {
    setPageContentLoading(true)
    try {
      const aboutRes = await fetch("https://dwalast-default-rtdb.firebaseio.com/pages/about.json")
      const contactRes = await fetch("https://dwalast-default-rtdb.firebaseio.com/pages/contact.json")

      if (!aboutRes.ok || !contactRes.ok) throw new Error("فشل في تحميل محتوى الصفحات")

      const aboutData = await aboutRes.json()
      const contactData = await contactRes.json()

      if (aboutData) setAboutContent(aboutData)
      if (contactData) setContactContent(contactData)
    } catch (error) {
      console.error("Error fetching page content:", error)
    } finally {
      setPageContentLoading(false)
    }
  }

  const fetchRatings = async () => {
    setRatingsManagementLoading(true)
    try {
      const productRatingsData = await getAllProductRatingsForAdmin()
      const websiteRatingsData = await getWebsiteRatings()
      setProductRatings(productRatingsData)
      setWebsiteRatings(websiteRatingsData)
    } catch (error) {
      console.error("Error fetching ratings for admin:", error)
      setRatingsMessage({ type: "error", text: "فشل في تحميل التقييمات." })
    } finally {
      setRatingsManagementLoading(false)
    }
  }

  const fetchShortages = async () => {
    setShortagesLoading(true)
    try {
      const data = await shortageManager.getShortages()
      setShortages(data)
    } catch (error) {
      console.error("Error fetching shortages:", error)
      setShortageMessage({ type: "error", text: "فشل في تحميل نواقص الأدوية." })
    } finally {
      setShortagesLoading(false)
    }
  }

  const saveDrugToFirebase = async (drugData: any, drugId?: string) => {
    try {
      const url = drugId
        ? `https://dwalast-default-rtdb.firebaseio.com/drugs/${drugId}.json`
        : `https://dwalast-default-rtdb.firebaseio.com/drugs/${getNextId()}.json`

      const response = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...drugData,
          updateDate: new Date().toLocaleDateString("ar-EG"),
          activeIngredient: drugData.activeIngredient || undefined,
          averageDiscountPercent: drugData.averageDiscountPercent
            ? Number.parseFloat(drugData.averageDiscountPercent)
            : undefined,
        }),
      })

      if (!response.ok) throw new Error("فشل في حفظ البيانات")

      // Update global updateDate
      await fetch("https://dwalast-default-rtdb.firebaseio.com/drugs/updateDate.json", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(new Date().toLocaleDateString("ar-EG")),
      })

      // Clear cache to force refresh
      cacheManager.clear()

      return true
    } catch (error) {
      console.error("Error saving drug:", error)
      return false
    }
  }

  const savePageContentToFirebase = async (pageName: string, content: any) => {
    try {
      const response = await fetch(`https://dwalast-default-rtdb.firebaseio.com/pages/${pageName}.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      })

      if (!response.ok) throw new Error("فشل في حفظ محتوى الصفحة")
      return true
    } catch (error) {
      console.error(`Error saving ${pageName} content:`, error)
      return false
    }
  }

  const deleteDrugFromFirebase = async (drugId: string) => {
    try {
      const response = await fetch(`https://dwalast-default-rtdb.firebaseio.com/drugs/${drugId}.json`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("فشل في حذف البيانات")

      // Clear cache to force refresh
      cacheManager.clear()

      return true
    } catch (error) {
      console.error("Error deleting drug:", error)
      return false
    }
  }

  const getNextId = () => {
    const maxId = drugs.length > 0 ? Math.max(...drugs.map((drug) => Number(drug.id))) : 0
    return (maxId + 1).toString()
  }

  const handleEditDrug = (drug: Drug) => {
    setEditingDrug({ ...drug })
    setIsAddingNew(false)
  }

  const handleSaveEdit = async () => {
    if (!editingDrug) return

    const success = await saveDrugToFirebase(
      {
        name: editingDrug.name,
        newPrice: editingDrug.newPrice.toString(),
        oldPrice: editingDrug.oldPrice.toString(),
        no: editingDrug.no,
        activeIngredient: editingDrug.activeIngredient,
        averageDiscountPercent: editingDrug.averageDiscountPercent,
      },
      editingDrug.id,
    )

    if (success) {
      setSaveMessage("تم حفظ التعديلات بنجاح")
      setEditingDrug(null)
      fetchDrugs()
      setTimeout(() => setSaveMessage(""), 3000)
    } else {
      setSaveMessage("فشل حفظ التعديلات")
      setTimeout(() => setSaveMessage(""), 3000)
    }
  }

  const handleAddNew = async () => {
    if (!newDrug.name || !newDrug.newPrice || !newDrug.oldPrice) {
      setSaveMessage("الرجاء ملء جميع الحقول المطلوبة")
      setTimeout(() => setSaveMessage(""), 3000)
      return
    }

    const success = await saveDrugToFirebase({
      name: newDrug.name,
      newPrice: newDrug.newPrice,
      oldPrice: newDrug.oldPrice,
      no: newDrug.no || getNextId(),
      activeIngredient: newDrug.activeIngredient,
      averageDiscountPercent: newDrug.averageDiscountPercent,
    })

    if (success) {
      setSaveMessage("تم إضافة الدواء بنجاح")
      setNewDrug({ name: "", newPrice: "", oldPrice: "", no: "", activeIngredient: "", averageDiscountPercent: "" })
      setIsAddingNew(false)
      fetchDrugs()
      setTimeout(() => setSaveMessage(""), 3000)
    } else {
      setSaveMessage("فشل إضافة الدواء")
      setTimeout(() => setSaveMessage(""), 3000)
    }
  }

  const handleDeleteDrug = async (drugId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الدواء؟")) return

    const success = await deleteDrugFromFirebase(drugId)
    if (success) {
      setSaveMessage("تم حذف الدواء بنجاح")
      fetchDrugs()
      setTimeout(() => setSaveMessage(""), 3000)
    } else {
      setSaveMessage("فشل حذف الدواء")
      setTimeout(() => setSaveMessage(""), 3000)
    }
  }

  const handleSaveAboutContent = async () => {
    const success = await savePageContentToFirebase("about", aboutContent)
    if (success) {
      setPageSaveMessage("تم حفظ محتوى صفحة 'عن الموقع' بنجاح")
      setTimeout(() => setPageSaveMessage(""), 3000)
    } else {
      setPageSaveMessage("فشل حفظ محتوى صفحة 'عن الموقع'")
      setTimeout(() => setPageSaveMessage(""), 3000)
    }
  }

  const handleSaveContactContent = async () => {
    const success = await savePageContentToFirebase("contact", contactContent)
    if (success) {
      setPageSaveMessage("تم حفظ محتوى صفحة 'تواصل معنا' بنجاح")
      setTimeout(() => setPageSaveMessage(""), 3000)
    } else {
      setPageSaveMessage("فشل حفظ محتوى صفحة 'تواصل معنا'")
      setTimeout(() => setPageSaveMessage(""), 3000)
    }
  }

  // Ratings Management Handlers
  const handleDeleteProductRating = async (drugId: string, ratingId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا التقييم؟")) return
    const success = await deleteRating("drug", drugId, ratingId)
    if (success) {
      setRatingsMessage({ type: "success", text: "تم حذف تقييم المنتج بنجاح." })
      fetchRatings()
    } else {
      setRatingsMessage({ type: "error", text: "فشل حذف تقييم المنتج." })
    }
    setTimeout(() => setRatingsMessage(null), 3000)
  }

  const handleDeleteWebsiteRating = async (ratingId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا التقييم؟")) return
    const success = await deleteRating("website", "website", ratingId) // "website" as itemId for website ratings
    if (success) {
      setRatingsMessage({ type: "success", text: "تم حذف تقييم الموقع بنجاح." })
      fetchRatings()
    } else {
      setRatingsMessage({ type: "error", text: "فشل حذف تقييم الموقع." })
    }
    setTimeout(() => setRatingsMessage(null), 3000)
  }

  const handleToggleProductRatingVerification = async (drugId: string, ratingId: string, currentStatus: boolean) => {
    const success = await updateRating("drug", drugId, ratingId, { isVerified: !currentStatus })
    if (success) {
      setRatingsMessage({ type: "success", text: `تم ${!currentStatus ? "توثيق" : "إلغاء توثيق"} تقييم المنتج.` })
      fetchRatings()
    } else {
      setRatingsMessage({ type: "error", text: `فشل ${!currentStatus ? "توثيق" : "إلغاء توثيق"} تقييم المنتج.` })
    }
    setTimeout(() => setRatingsMessage(null), 3000)
  }

  const handleToggleWebsiteRatingVerification = async (ratingId: string, currentStatus: boolean) => {
    const success = await updateRating("website", null, ratingId, { isVerified: !currentStatus }) // null for itemId for website ratings
    if (success) {
      setRatingsMessage({ type: "success", text: `تم ${!currentStatus ? "توثيق" : "إلغاء توثيق"} تقييم الموقع.` })
      fetchRatings()
    } else {
      setRatingsMessage({ type: "error", text: `فشل ${!currentStatus ? "توثيق" : "إلغاء توثيق"} تقييم الموقع.` })
    }
    setTimeout(() => setRatingsMessage(null), 3000)
  }

  // Shortages Management Handlers
  const handleAddNewShortage = async () => {
    if (!newShortage.drugName || !newShortage.reason || !newShortage.status) {
      setShortageMessage({ type: "error", text: "الرجاء ملء جميع الحقول المطلوبة لإضافة النقص." })
      setTimeout(() => setShortageMessage(null), 3000)
      return
    }

    const success = await shortageManager.addShortage(
      newShortage.drugName, // Pass drug name directly
      newShortage.reason,
      newShortage.status,
      "Admin", // Or current admin user
    )

    if (success) {
      setShortageMessage({ type: "success", text: "تم إضافة نقص الدواء بنجاح." })
      setNewShortage({ drugName: "", reason: "", status: "moderate" })
      setIsAddingNewShortage(false)
      fetchShortages()
    } else {
      setShortageMessage({ type: "error", text: "فشل إضافة نقص الدواء." })
    }
    setTimeout(() => setShortageMessage(null), 3000)
  }

  const handleEditShortage = (shortage: Shortage) => {
    setEditingShortage({ ...shortage })
    setIsAddingNewShortage(false)
  }

  const handleSaveShortageEdit = async () => {
    if (!editingShortage) return

    const success = await shortageManager.updateShortage(editingShortage.id, {
      drugName: editingShortage.drugName, // Allow editing drug name
      reason: editingShortage.reason,
      status: editingShortage.status,
    })

    if (success) {
      setShortageMessage({ type: "success", text: "تم حفظ تعديلات نقص الدواء بنجاح." })
      setEditingShortage(null)
      fetchShortages()
    } else {
      setShortageMessage({ type: "error", text: "فشل حفظ تعديلات نقص الدواء." })
    }
    setTimeout(() => setShortageMessage(null), 3000)
  }

  const handleDeleteShortage = async (shortageId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا النقص؟")) return
    const success = await shortageManager.deleteShortage(shortageId)
    if (success) {
      setShortageMessage({ type: "success", text: "تم حذف نقص الدواء بنجاح." })
      fetchShortages()
    } else {
      setShortageMessage({ type: "error", text: "فشل حذف نقص الدواء." })
    }
    setTimeout(() => setShortageMessage(null), 3000)
  }

  // Data Management Functions
  const fetchBackups = async () => {
    try {
      const backupsData = await dataManager.getBackups()
      setBackups(backupsData)
    } catch (error) {
      console.error("Error fetching backups:", error)
    }
  }

  const handleImportFromFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setDataManagementLoading(true)
    setDataManagementMessage(null)

    try {
      const adminEmail = authManager.getCurrentUser() || "admin@example.com"
      const result = await dataManager.importFromFile(file, adminEmail)
      
      if (result.success) {
        setDataManagementMessage({ 
          type: "success", 
          text: `${result.message}${result.errors ? ` (${result.errors.length} أخطاء)` : ''}` 
        })
        fetchDrugs() // Refresh drugs list
        fetchBackups() // Refresh backups
      } else {
        setDataManagementMessage({ type: "error", text: result.message })
      }
    } catch (error) {
      console.error("Import error:", error)
      setDataManagementMessage({ type: "error", text: "حدث خطأ أثناء الاستيراد" })
    } finally {
      setDataManagementLoading(false)
      event.target.value = "" // Reset file input
    }
  }

  const handleImportFromUrl = async () => {
    if (!importUrl.trim()) {
      setDataManagementMessage({ type: "error", text: "يرجى إدخال رابط صحيح" })
      return
    }

    setDataManagementLoading(true)
    setDataManagementMessage(null)

    try {
      const adminEmail = authManager.getCurrentUser() || "admin@example.com"
      const result = await dataManager.importFromUrl(importUrl, adminEmail)
      
      if (result.success) {
        setDataManagementMessage({ 
          type: "success", 
          text: `${result.message}${result.errors ? ` (${result.errors.length} أخطاء)` : ''}` 
        })
        setImportUrl("") // Clear URL input
        fetchDrugs() // Refresh drugs list
        fetchBackups() // Refresh backups
      } else {
        setDataManagementMessage({ type: "error", text: result.message })
      }
    } catch (error) {
      console.error("Import from URL error:", error)
      setDataManagementMessage({ type: "error", text: "حدث خطأ أثناء الاستيراد من الرابط" })
    } finally {
      setDataManagementLoading(false)
    }
  }

  const handleExportData = async () => {
    try {
      const data = await dataManager.exportData()
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `drugs_data_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Export error:", error)
      setDataManagementMessage({ type: "error", text: "حدث خطأ أثناء تصدير البيانات" })
    }
  }

  const handleDeleteAllData = async () => {
    if (!confirm("هل أنت متأكد من حذف جميع البيانات؟ هذا الإجراء لا يمكن التراجع عنه!")) return

    setDataManagementLoading(true)
    setDataManagementMessage(null)

    try {
      const adminEmail = authManager.getCurrentUser() || "admin@example.com"
      const success = await dataManager.deleteAllData(adminEmail)
      
      if (success) {
        setDataManagementMessage({ type: "success", text: "تم حذف جميع البيانات بنجاح" })
        fetchDrugs() // Refresh drugs list
        fetchBackups() // Refresh backups
      } else {
        setDataManagementMessage({ type: "error", text: "فشل في حذف البيانات" })
      }
    } catch (error) {
      console.error("Delete all data error:", error)
      setDataManagementMessage({ type: "error", text: "حدث خطأ أثناء حذف البيانات" })
    } finally {
      setDataManagementLoading(false)
    }
  }

  const handleRestoreData = async () => {
    if (!selectedBackup) {
      setDataManagementMessage({ type: "error", text: "يرجى اختيار نسخة احتياطية" })
      return
    }

    if (!confirm("هل أنت متأكد من استعادة البيانات؟ سيتم استبدال البيانات الحالية.")) return

    setDataManagementLoading(true)
    setDataManagementMessage(null)

    try {
      const adminEmail = authManager.getCurrentUser() || "admin@example.com"
      const success = await dataManager.restoreData(selectedBackup, adminEmail)
      
      if (success) {
        setDataManagementMessage({ type: "success", text: "تم استعادة البيانات بنجاح" })
        setSelectedBackup("") // Clear selection
        fetchDrugs() // Refresh drugs list
        fetchBackups() // Refresh backups
      } else {
        setDataManagementMessage({ type: "error", text: "فشل في استعادة البيانات" })
      }
    } catch (error) {
      console.error("Restore data error:", error)
      setDataManagementMessage({ type: "error", text: "حدث خطأ أثناء استعادة البيانات" })
    } finally {
      setDataManagementLoading(false)
    }
  }

  const filteredDrugs = drugs.filter(
    (drug) =>
      drug.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      drug.no.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const filteredShortages = shortages.filter(
    (shortage) =>
      shortage.drugName.toLowerCase().includes(shortageSearchTerm.toLowerCase()) ||
      shortage.reason.toLowerCase().includes(shortageSearchTerm.toLowerCase()),
  )

  // Pagination for admin drug list
  const adminTotalPages = Math.ceil(filteredDrugs.length / ADMIN_ITEMS_PER_PAGE)
  const paginatedAdminDrugs = filteredDrugs.slice(
    (adminCurrentPage - 1) * ADMIN_ITEMS_PER_PAGE,
    adminCurrentPage * ADMIN_ITEMS_PER_PAGE,
  )

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white/10 backdrop-blur-md">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full w-20 h-20 flex items-center justify-center mb-4">
              <Shield className="h-10 w-10 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold text-white">لوحة الإدارة</CardTitle>
            <p className="text-gray-300">تسجيل دخول المدير</p>
          </CardHeader>
          <CardContent>
            {loginError && (
              <Alert className="mb-4 border-red-500 bg-red-500/10">
                <AlertDescription className="text-red-400">{loginError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-white">
                  البريد الإلكتروني
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                  placeholder="admin@example.com"
                  required
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-white">
                  كلمة المرور
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 pr-10"
                    placeholder="••••••••"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                size="lg"
              >
                <LogIn className="ml-2 h-4 w-4" />
                تسجيل الدخول
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">لوحة إدارة الأدوية</h1>
              <p className="text-gray-600">إدارة قاعدة بيانات الأدوية ومحتوى الموقع</p>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-50 bg-transparent"
          >
            <LogOut className="ml-2 h-4 w-4" />
            تسجيل الخروج
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <Button
            variant="ghost"
            className={`rounded-none border-b-2 flex-1 ${activeTab === "drugs" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-600 hover:text-blue-600"}`}
            onClick={() => setActiveTab("drugs")}
          >
            <Database className="ml-2 h-5 w-5" />
            إدارة الأدوية
          </Button>
          <Button
            variant="ghost"
            className={`rounded-none border-b-2 flex-1 ${activeTab === "pages" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-600 hover:text-blue-600"}`}
            onClick={() => setActiveTab("pages")}
          >
            <FileText className="ml-2 h-5 w-5" />
            إدارة الصفحات
          </Button>
          <Button
            variant="ghost"
            className={`rounded-none border-b-2 flex-1 ${activeTab === "ratings" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-600 hover:text-blue-600"}`}
            onClick={() => setActiveTab("ratings")}
          >
            <Star className="ml-2 h-5 w-5" />
            إدارة التقييمات
          </Button>
          <Button
            variant="ghost"
            className={`rounded-none border-b-2 flex-1 ${activeTab === "shortages" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-600 hover:text-blue-600"}`}
            onClick={() => setActiveTab("shortages")}
          >
            <AlertTriangle className="ml-2 h-5 w-5" />
            إدارة النواقص
          </Button>
          <Button
            variant="ghost"
            className={`rounded-none border-b-2 flex-1 ${activeTab === "data" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-600 hover:text-blue-600"}`}
            onClick={() => setActiveTab("data")}
          >
            <Database className="ml-2 h-5 w-5" />
            إدارة البيانات
          </Button>
        </div>

        {/* Drugs Management Tab */}
        {activeTab === "drugs" && (
          <>
            {/* Success Message */}
            {saveMessage && (
              <Alert className="mb-6 border-green-200 bg-green-50">
                <AlertDescription className="text-green-800">{saveMessage}</AlertDescription>
              </Alert>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100">إجمالي الأدوية</p>
                      <p className="text-3xl font-bold">{drugs.length}</p>
                    </div>
                    <Database className="h-12 w-12 text-blue-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100">أدوية محدثة اليوم</p>
                      <p className="text-3xl font-bold">
                        {drugs.filter((drug) => drug.updateDate === new Date().toLocaleDateString("ar-EG")).length}
                      </p>
                    </div>
                    <TrendingUp className="h-12 w-12 text-green-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100">متوسط السعر</p>
                      <p className="text-3xl font-bold">
                        {drugs.length > 0
                          ? (drugs.reduce((sum, drug) => sum + drug.newPrice, 0) / drugs.length).toFixed(2)
                          : 0}
                      </p>
                    </div>
                    <Users className="h-12 w-12 text-purple-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100">أعلى سعر</p>
                      <p className="text-3xl font-bold">
                        {drugs.length > 0 ? Math.max(...drugs.map((drug) => drug.newPrice)).toFixed(2) : 0}
                      </p>
                    </div>
                    <TrendingUp className="h-12 w-12 text-orange-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Controls */}
            <Card className="mb-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="البحث في الأدوية..."
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value)
                          setAdminCurrentPage(1) // Reset pagination on search
                        }}
                        className="pl-10 border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                        dir="rtl"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setIsAddingNew(true)
                        setEditingDrug(null)
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Plus className="ml-2 h-4 w-4" />
                      إضافة دواء جديد
                    </Button>

                    <Button onClick={fetchDrugs} variant="outline" disabled={loading}>
                      <RefreshCw className={`ml-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                      تحديث
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Add New Drug Form */}
            {isAddingNew && (
              <Card className="mb-6 shadow-lg border-0 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-green-800 flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    إضافة دواء جديد
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <Label>اسم الدواء</Label>
                      <Input
                        value={newDrug.name}
                        onChange={(e) => setNewDrug({ ...newDrug, name: e.target.value })}
                        placeholder="أدخل اسم الدواء"
                        dir="rtl"
                      />
                    </div>
                    <div>
                      <Label>المادة الفعالة</Label>
                      <Input
                        value={newDrug.activeIngredient || ""}
                        onChange={(e) => setNewDrug({ ...newDrug, activeIngredient: e.target.value })}
                        placeholder="أدخل المادة الفعالة"
                        dir="rtl"
                      />
                    </div>
                    <div>
                      <Label>السعر الجديد</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={newDrug.newPrice}
                        onChange={(e) => setNewDrug({ ...newDrug, newPrice: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label>السعر القديم</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={newDrug.oldPrice}
                        onChange={(e) => setNewDrug({ ...newDrug, oldPrice: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label>رقم الدواء</Label>
                      <Input
                        value={newDrug.no}
                        onChange={(e) => setNewDrug({ ...newDrug, no: e.target.value })}
                        placeholder={getNextId()}
                      />
                    </div>
                    <div>
                      <Label>متوسط نسبة الخصم (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={newDrug.averageDiscountPercent || ""}
                        onChange={(e) => setNewDrug({ ...newDrug, averageDiscountPercent: e.target.value })}
                        placeholder="0.0"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddNew} className="bg-green-600 hover:bg-green-700 text-white">
                      <Save className="ml-2 h-4 w-4" />
                      حفظ الدواء
                    </Button>
                    <Button onClick={() => setIsAddingNew(false)} variant="outline">
                      <X className="ml-2 h-4 w-4" />
                      إلغاء
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Drugs Table */}
            <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>قائمة الأدوية ({filteredDrugs.length})</span>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    {loading ? "جاري التحميل..." : "محدث"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-right p-3 font-semibold text-gray-700">الرقم</th>
                        <th className="text-right p-3 font-semibold text-gray-700">اسم الدواء</th>
                        <th className="text-right p-3 font-semibold text-gray-700">المادة الفعالة</th>
                        <th className="text-right p-3 font-semibold text-gray-700">السعر الجديد</th>
                        <th className="text-right p-3 font-semibold text-gray-700">السعر القديم</th>
                        <th className="text-right p-3 font-semibold text-gray-700">متوسط الخصم</th>
                        <th className="text-right p-3 font-semibold text-gray-700">التغيير</th>
                        <th className="text-right p-3 font-semibold text-gray-700">آخر تحديث</th>
                        <th className="text-center p-3 font-semibold text-gray-700">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedAdminDrugs.map((drug) => (
                        <tr key={drug.id} className="border-b border-gray-100 hover:bg-gray-50">
                          {editingDrug?.id === drug.id ? (
                            <>
                              <td className="p-2">{drug.no}</td>
                              <td className="p-2">
                                <Input
                                  value={editingDrug.name}
                                  onChange={(e) => setEditingDrug({ ...editingDrug, name: e.target.value })}
                                  className="w-full max-w-[180px]"
                                  dir="rtl"
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  value={editingDrug.activeIngredient || ""}
                                  onChange={(e) => setEditingDrug({ ...editingDrug, activeIngredient: e.target.value })}
                                  className="w-full max-w-[180px]"
                                  placeholder="المادة الفعالة"
                                  dir="rtl"
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={editingDrug.newPrice}
                                  onChange={(e) =>
                                    setEditingDrug({ ...editingDrug, newPrice: Number.parseFloat(e.target.value) || 0 })
                                  }
                                  className="w-full max-w-[90px]"
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={editingDrug.oldPrice}
                                  onChange={(e) =>
                                    setEditingDrug({ ...editingDrug, oldPrice: Number.parseFloat(e.target.value) || 0 })
                                  }
                                  className="w-full max-w-[90px]"
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={editingDrug.averageDiscountPercent || ""}
                                  onChange={(e) =>
                                    setEditingDrug({
                                      ...editingDrug,
                                      averageDiscountPercent: Number.parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  className="w-full max-w-[90px]"
                                  placeholder="الخصم"
                                />
                              </td>
                              <td className="p-2">
                                <Badge
                                  variant="outline"
                                  className={
                                    editingDrug.newPrice - editingDrug.oldPrice > 0
                                      ? "text-red-600 bg-red-50"
                                      : editingDrug.newPrice - editingDrug.oldPrice < 0
                                        ? "text-green-600 bg-green-50"
                                        : "text-gray-600 bg-gray-50"
                                  }
                                >
                                  {(editingDrug.newPrice - editingDrug.oldPrice).toFixed(2)}
                                </Badge>
                              </td>
                              <td className="p-2 text-sm text-gray-600">{drug.updateDate}</td>
                              <td className="p-2">
                                <div className="flex gap-0.5 justify-center">
                                  <Button
                                    onClick={handleSaveEdit}
                                    size="icon"
                                    className="h-7 w-7 bg-green-600 hover:bg-green-700"
                                  >
                                    <Save className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    onClick={() => setEditingDrug(null)}
                                    size="icon"
                                    className="h-7 w-7"
                                    variant="outline"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="p-2 font-medium">{drug.no}</td>
                              <td className="p-2" dir="rtl">
                                {drug.name}
                              </td>
                              <td className="p-2 text-gray-700" dir="rtl">
                                {drug.activeIngredient || "-"}
                              </td>
                              <td className="p-2 font-semibold text-blue-600">{drug.newPrice.toFixed(2)} جنيه</td>
                              <td className="p-2 text-gray-600">{drug.oldPrice.toFixed(2)} جنيه</td>
                              <td className="p-2">
                                {drug.averageDiscountPercent !== undefined ? (
                                  <Badge variant="outline" className="text-purple-600 bg-purple-50">
                                    {drug.averageDiscountPercent.toFixed(1)}%
                                  </Badge>
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td className="p-2">
                                <Badge
                                  variant="outline"
                                  className={
                                    drug.newPrice - drug.oldPrice > 0
                                      ? "text-red-600 bg-red-50"
                                      : drug.newPrice - drug.oldPrice < 0
                                        ? "text-green-600 bg-green-50"
                                        : "text-gray-600 bg-gray-50"
                                  }
                                >
                                  {drug.newPrice - drug.oldPrice > 0 ? "+" : ""}
                                  {(drug.newPrice - drug.oldPrice).toFixed(2)}
                                </Badge>
                              </td>
                              <td className="p-2 text-sm text-gray-600">{drug.updateDate}</td>
                              <td className="p-2">
                                <div className="flex gap-0.5 justify-center">
                                  <Button
                                    onClick={() => handleEditDrug(drug)}
                                    size="icon"
                                    variant="outline"
                                    className="h-7 w-7 text-blue-600 hover:bg-blue-50"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    onClick={() => handleDeleteDrug(drug.id)}
                                    size="icon"
                                    variant="outline"
                                    className="h-7 w-7 text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {filteredDrugs.length === 0 && (
                    <div className="text-center py-12">
                      <Database className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-600 mb-2">لا توجد أدوية</h3>
                      <p className="text-gray-500">ابدأ بإضافة أدوية جديدة</p>
                    </div>
                  )}
                </div>

                {/* Admin Pagination Controls */}
                {adminTotalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setAdminCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={adminCurrentPage === 1}
                      className="border-gray-200 hover:bg-blue-50"
                    >
                      <ChevronRight className="h-4 w-4" />
                      السابق
                    </Button>

                    <div className="flex gap-1">
                      {Array.from({ length: adminTotalPages }, (_, i) => i + 1).map((pageNum) => (
                        <Button
                          key={pageNum}
                          variant={adminCurrentPage === pageNum ? "default" : "outline"}
                          onClick={() => setAdminCurrentPage(pageNum)}
                          className={`w-10 h-10 ${
                            adminCurrentPage === pageNum
                              ? "bg-blue-600 hover:bg-blue-700"
                              : "border-gray-200 hover:bg-blue-50"
                          }`}
                        >
                          {pageNum}
                        </Button>
                      ))}
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => setAdminCurrentPage((prev) => Math.min(prev + 1, adminTotalPages))}
                      disabled={adminCurrentPage === adminTotalPages}
                      className="border-gray-200 hover:bg-blue-50"
                    >
                      التالي
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Pages Management Tab */}
        {activeTab === "pages" && (
          <>
            {pageContentLoading && (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">جاري تحميل محتوى الصفحات...</p>
              </div>
            )}

            {pageSaveMessage && (
              <Alert className="mb-6 border-green-200 bg-green-50">
                <AlertDescription className="text-green-800">{pageSaveMessage}</AlertDescription>
              </Alert>
            )}

            {/* About Page Editor */}
            <Card className="mb-8 shadow-lg border-0 bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-800">تعديل صفحة "عن الموقع"</CardTitle>
                <p className="text-gray-600">قم بتحديث النصوص الرئيسية لصفحة "عن الموقع"</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="aboutTitle">عنوان الصفحة</Label>
                  <Input
                    id="aboutTitle"
                    value={aboutContent.title}
                    onChange={(e) => setAboutContent({ ...aboutContent, title: e.target.value })}
                    dir="rtl"
                  />
                </div>
                <div>
                  <Label htmlFor="aboutIntro">مقدمة الصفحة</Label>
                  <Textarea
                    id="aboutIntro"
                    value={aboutContent.intro}
                    onChange={(e) => setAboutContent({ ...aboutContent, intro: e.target.value })}
                    rows={3}
                    dir="rtl"
                  />
                </div>
                <div>
                  <Label htmlFor="aboutMissionTitle">عنوان رسالتنا</Label>
                  <Input
                    id="aboutMissionTitle"
                    value={aboutContent.missionTitle}
                    onChange={(e) => setAboutContent({ ...aboutContent, missionTitle: e.target.value })}
                    dir="rtl"
                  />
                </div>
                <div>
                  <Label htmlFor="aboutMissionText">نص رسالتنا</Label>
                  <Textarea
                    id="aboutMissionText"
                    value={aboutContent.missionText}
                    onChange={(e) => setAboutContent({ ...aboutContent, missionText: e.target.value })}
                    rows={5}
                    dir="rtl"
                  />
                </div>
                <div>
                  <Label htmlFor="aboutTeamIntro">مقدمة فريق العمل</Label>
                  <Textarea
                    id="aboutTeamIntro"
                    value={aboutContent.teamIntro}
                    onChange={(e) => setAboutContent({ ...aboutContent, teamIntro: e.target.value })}
                    rows={3}
                    dir="rtl"
                  />
                </div>
                <div>
                  <Label htmlFor="aboutTeamMedical">وصف الفريق الطبي</Label>
                  <Textarea
                    id="aboutTeamMedical"
                    value={aboutContent.teamMedical}
                    onChange={(e) => setAboutContent({ ...aboutContent, teamMedical: e.target.value })}
                    rows={3}
                    dir="rtl"
                  />
                </div>
                <div>
                  <Label htmlFor="aboutTeamDev">وصف فريق التطوير</Label>
                  <Textarea
                    id="aboutTeamDev"
                    value={aboutContent.teamDev}
                    onChange={(e) => setAboutContent({ ...aboutContent, teamDev: e.target.value })}
                    rows={3}
                    dir="rtl"
                  />
                </div>
                <Button onClick={handleSaveAboutContent} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Save className="ml-2 h-4 w-4" />
                  حفظ تعديلات "عن الموقع"
                </Button>
              </CardContent>
            </Card>

            {/* Contact Page Editor */}
            <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-800">تعديل صفحة "تواصل معنا"</CardTitle>
                <p className="text-gray-600">قم بتحديث معلومات التواصل والأسئلة الشائعة</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="contactTitle">عنوان الصفحة</Label>
                  <Input
                    id="contactTitle"
                    value={contactContent.title}
                    onChange={(e) => setContactContent({ ...contactContent, title: e.target.value })}
                    dir="rtl"
                  />
                </div>
                <div>
                  <Label htmlFor="contactIntro">مقدمة الصفحة</Label>
                  <Textarea
                    id="contactIntro"
                    value={contactContent.intro}
                    onChange={(e) => setContactContent({ ...contactContent, intro: e.target.value })}
                    rows={3}
                    dir="rtl"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email1">البريد الإلكتروني 1</Label>
                    <Input
                      id="email1"
                      value={contactContent.email1}
                      onChange={(e) => setContactContent({ ...contactContent, email1: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email2">البريد الإلكتروني 2</Label>
                    <Input
                      id="email2"
                      value={contactContent.email2}
                      onChange={(e) => setContactContent({ ...contactContent, email2: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone1">الهاتف 1</Label>
                    <Input
                      id="phone1"
                      value={contactContent.phone1}
                      onChange={(e) => setContactContent({ ...contactContent, phone1: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone2">الهاتف 2</Label>
                    <Input
                      id="phone2"
                      value={contactContent.phone2}
                      onChange={(e) => setContactContent({ ...contactContent, phone2: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="address1">العنوان 1</Label>
                    <Input
                      id="address1"
                      value={contactContent.address1}
                      onChange={(e) => setContactContent({ ...contactContent, address1: e.target.value })}
                      dir="rtl"
                    />
                  </div>
                  <div>
                    <Label htmlFor="address2">العنوان 2</Label>
                    <Input
                      id="address2"
                      value={contactContent.address2}
                      onChange={(e) => setContactContent({ ...contactContent, address2: e.target.value })}
                      dir="rtl"
                    />
                  </div>
                  <div>
                    <Label htmlFor="workHours1">ساعات العمل 1</Label>
                    <Input
                      id="workHours1"
                      value={contactContent.workHours1}
                      onChange={(e) => setContactContent({ ...contactContent, workHours1: e.target.value })}
                      dir="rtl"
                    />
                  </div>
                  <div>
                    <Label htmlFor="workHours2">ساعات العمل 2</Label>
                    <Input
                      id="workHours2"
                      value={contactContent.workHours2}
                      onChange={(e) => setContactContent({ ...contactContent, workHours2: e.target.value })}
                      dir="rtl"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="responseTitle">عنوان الاستجابة السريعة</Label>
                  <Input
                    id="responseTitle"
                    value={contactContent.responseTitle}
                    onChange={(e) => setContactContent({ ...contactContent, responseTitle: e.target.value })}
                    dir="rtl"
                  />
                </div>
                <div>
                  <Label htmlFor="responseText">نص الاستجابة السريعة</Label>
                  <Textarea
                    id="responseText"
                    value={contactContent.responseText}
                    onChange={(e) => setContactContent({ ...contactContent, responseText: e.target.value })}
                    rows={3}
                    dir="rtl"
                  />
                </div>
                <Button onClick={handleSaveContactContent} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Save className="ml-2 h-4 w-4" />
                  حفظ تعديلات "تواصل معنا"
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {/* Ratings Management Tab */}
        {activeTab === "ratings" && (
          <>
            {ratingsManagementLoading && (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">جاري تحميل التقييمات...</p>
              </div>
            )}

            {ratingsMessage && (
              <Alert
                className={`mb-6 ${ratingsMessage.type === "success" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}
              >
                <AlertDescription
                  className={`text-sm ${ratingsMessage.type === "success" ? "text-green-800" : "text-red-800"}`}
                >
                  {ratingsMessage.text}
                </AlertDescription>
              </Alert>
            )}

            {/* Product Ratings */}
            <Card className="mb-8 shadow-lg border-0 bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <Star className="h-6 w-6 text-yellow-500" />
                  تقييمات المنتجات ({productRatings.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {productRatings.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">لا توجد تقييمات للمنتجات بعد.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-right p-3 font-semibold text-gray-700">المنتج</th>
                          <th className="text-right p-3 font-semibold text-gray-700">المستخدم</th>
                          <th className="text-right p-3 font-semibold text-gray-700">التقييم</th>
                          <th className="text-right p-3 font-semibold text-gray-700">التعليق</th>
                          <th className="text-right p-3 font-semibold text-gray-700">التاريخ</th>
                          <th className="text-center p-3 font-semibold text-gray-700">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productRatings.map((rating) => (
                          <tr key={rating.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="p-3 font-medium text-blue-600">
                              {drugs.find((d) => d.id === rating.drugId)?.name || `ID: ${rating.drugId}`}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2" dir="rtl">
                                {rating.profilePictureUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={rating.profilePictureUrl || "/placeholder.svg"}
                                    alt={rating.userName}
                                    className="w-6 h-6 rounded-full object-cover"
                                  />
                                ) : (
                                  <User className="h-6 w-6 text-gray-500 p-0.5 bg-gray-100 rounded-full" />
                                )}
                                <span>{rating.userName}</span>
                                {rating.isPharmacist && (
                                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
                                    <Flask className="h-3 w-3 ml-1" /> {/* Changed Pharmacy to Flask */}
                                    صيدلي
                                  </Badge>
                                )}
                                {rating.isVerified && (
                                  <Verified className="h-4 w-4 text-blue-500 fill-blue-500" title="موثق" />
                                )}
                              </div>
                              <div className="text-xs text-gray-500" dir="rtl">
                                {rating.governorate} {rating.pharmacyName && `(${rating.pharmacyName})`}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex gap-0.5" dir="ltr">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-4 w-4 ${
                                      star <= rating.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"
                                    }`}
                                  />
                                ))}
                              </div>
                            </td>
                            <td className="p-3 text-gray-700 max-w-[250px] truncate" dir="rtl">
                              {rating.comment}
                            </td>
                            <td className="p-3 text-sm text-gray-600">
                              {new Date(rating.timestamp).toLocaleDateString("ar-EG")}
                            </td>
                            <td className="p-3">
                              <div className="flex gap-1 justify-center">
                                <Button
                                  onClick={() =>
                                    handleToggleProductRatingVerification(rating.drugId, rating.id, rating.isVerified)
                                  }
                                  size="sm"
                                  variant={rating.isVerified ? "default" : "outline"}
                                  className={
                                    rating.isVerified
                                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                                      : "text-blue-600 hover:bg-blue-50"
                                  }
                                  title={rating.isVerified ? "إلغاء التوثيق" : "توثيق التقييم"}
                                >
                                  <Verified className="h-3 w-3" />
                                </Button>
                                <Button
                                  onClick={() => handleDeleteProductRating(rating.drugId, rating.id)}
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 hover:bg-red-50"
                                  title="حذف التقييم"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Website Ratings */}
            <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <Star className="h-6 w-6 text-yellow-500" />
                  تقييمات الموقع ({websiteRatings.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {websiteRatings.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">لا توجد تقييمات للموقع بعد.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-right p-3 font-semibold text-gray-700">المستخدم</th>
                          <th className="text-right p-3 font-semibold text-gray-700">التقييم</th>
                          <th className="text-right p-3 font-semibold text-gray-700">التعليق</th>
                          <th className="text-right p-3 font-semibold text-gray-700">التاريخ</th>
                          <th className="text-center p-3 font-semibold text-gray-700">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {websiteRatings.map((rating) => (
                          <tr key={rating.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="p-3">
                              <div className="flex items-center gap-2" dir="rtl">
                                {rating.profilePictureUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={rating.profilePictureUrl || "/placeholder.svg"}
                                    alt={rating.userName}
                                    className="w-6 h-6 rounded-full object-cover"
                                  />
                                ) : (
                                  <User className="h-6 w-6 text-gray-500 p-0.5 bg-gray-100 rounded-full" />
                                )}
                                <span>{rating.userName}</span>
                                {rating.isPharmacist && (
                                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
                                    <Flask className="h-3 w-3 ml-1" /> {/* Changed Pharmacy to Flask */}
                                    صيدلي
                                  </Badge>
                                )}
                                {rating.isVerified && (
                                  <Verified className="h-4 w-4 text-blue-500 fill-blue-500" title="موثق" />
                                )}
                              </div>
                              <div className="text-xs text-gray-500" dir="rtl">
                                {rating.governorate} {rating.pharmacyName && `(${rating.pharmacyName})`}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex gap-0.5" dir="ltr">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-4 w-4 ${
                                      star <= rating.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"
                                    }`}
                                  />
                                ))}
                              </div>
                            </td>
                            <td className="p-3 text-gray-700 max-w-[250px] truncate" dir="rtl">
                              {rating.comment}
                            </td>
                            <td className="p-3 text-sm text-gray-600">
                              {new Date(rating.timestamp).toLocaleDateString("ar-EG")}
                            </td>
                            <td className="p-3">
                              <div className="flex gap-1 justify-center">
                                <Button
                                  onClick={() => handleToggleWebsiteRatingVerification(rating.id, rating.isVerified)}
                                  size="sm"
                                  variant={rating.isVerified ? "default" : "outline"}
                                  className={
                                    rating.isVerified
                                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                                      : "text-blue-600 hover:bg-blue-50"
                                  }
                                  title={rating.isVerified ? "إلغاء التوثيق" : "توثيق التقييم"}
                                >
                                  <Verified className="h-3 w-3" />
                                </Button>
                                <Button
                                  onClick={() => handleDeleteWebsiteRating(rating.id)}
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 hover:bg-red-50"
                                  title="حذف التقييم"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Shortages Management Tab */}
        {activeTab === "shortages" && (
          <>
            {shortagesLoading && (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">جاري تحميل نواقص الأدوية...</p>
              </div>
            )}

            {shortageMessage && (
              <Alert
                className={`mb-6 ${shortageMessage.type === "success" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}
              >
                <AlertDescription
                  className={`text-sm ${shortageMessage.type === "success" ? "text-green-800" : "text-red-800"}`}
                >
                  {shortageMessage.text}
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
                        placeholder="البحث في النواقص..."
                        value={shortageSearchTerm}
                        onChange={(e) => setShortageSearchTerm(e.target.value)}
                        className="pl-10 border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                        dir="rtl"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setIsAddingNewShortage(true)
                        setEditingShortage(null)
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Plus className="ml-2 h-4 w-4" />
                      إضافة نقص جديد
                    </Button>

                    <Button onClick={fetchShortages} variant="outline" disabled={shortagesLoading}>
                      <RefreshCw className={`ml-2 h-4 w-4 ${shortagesLoading ? "animate-spin" : ""}`} />
                      تحديث
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Add New Shortage Form */}
            {isAddingNewShortage && (
              <Card className="mb-6 shadow-lg border-0 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-green-800 flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    إضافة نقص دواء جديد
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label htmlFor="shortageDrugName">اسم الدواء</Label>
                      <Input
                        id="shortageDrugName"
                        value={newShortage.drugName}
                        onChange={(e) => setNewShortage({ ...newShortage, drugName: e.target.value })}
                        placeholder="أدخل اسم الدواء"
                        dir="rtl"
                      />
                    </div>
                    <div>
                      <Label htmlFor="shortageReason">السبب</Label>
                      <Input
                        id="shortageReason"
                        value={newShortage.reason}
                        onChange={(e) => setNewShortage({ ...newShortage, reason: e.target.value })}
                        placeholder="مثال: نقص في المادة الخام"
                        dir="rtl"
                      />
                    </div>
                    <div>
                      <Label htmlFor="shortageStatus">الحالة</Label>
                      <Select
                        value={newShortage.status}
                        onValueChange={(value: "critical" | "moderate" | "resolved") =>
                          setNewShortage({ ...newShortage, status: value })
                        }
                      >
                        <SelectTrigger className="w-full" dir="rtl">
                          <SelectValue placeholder="اختر الحالة" />
                        </SelectTrigger>
                        <SelectContent dir="rtl">
                          <SelectItem value="critical">حرجة</SelectItem>
                          <SelectItem value="moderate">متوسطة</SelectItem>
                          <SelectItem value="resolved">تم حلها</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddNewShortage} className="bg-green-600 hover:bg-green-700 text-white">
                      <Save className="ml-2 h-4 w-4" />
                      حفظ النقص
                    </Button>
                    <Button onClick={() => setIsAddingNewShortage(false)} variant="outline">
                      <X className="ml-2 h-4 w-4" />
                      إلغاء
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Shortages Table */}
            <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>قائمة نواقص الأدوية ({filteredShortages.length})</span>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    {shortagesLoading ? "جاري التحميل..." : "محدث"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-right p-3 font-semibold text-gray-700">اسم الدواء</th>
                        <th className="text-right p-3 font-semibold text-gray-700">السبب</th>
                        <th className="text-right p-3 font-semibold text-gray-700">الحالة</th>
                        <th className="text-right p-3 font-semibold text-gray-700">تاريخ الإبلاغ</th>
                        <th className="text-right p-3 font-semibold text-gray-700">آخر تحديث</th>
                        <th className="text-center p-3 font-semibold text-gray-700">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredShortages.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-gray-500">
                            لا توجد نواقص أدوية مسجلة حالياً.
                          </td>
                        </tr>
                      ) : (
                        filteredShortages.map((shortage) => (
                          <tr key={shortage.id} className="border-b border-gray-100 hover:bg-gray-50">
                            {editingShortage?.id === shortage.id ? (
                              <>
                                <td className="p-2">
                                  <Input
                                    value={editingShortage.drugName}
                                    onChange={(e) =>
                                      setEditingShortage({ ...editingShortage, drugName: e.target.value })
                                    }
                                    className="w-full max-w-[180px]"
                                    dir="rtl"
                                  />
                                </td>
                                <td className="p-2">
                                  <Input
                                    value={editingShortage.reason}
                                    onChange={(e) => setEditingShortage({ ...editingShortage, reason: e.target.value })}
                                    className="w-full max-w-[180px]"
                                    dir="rtl"
                                  />
                                </td>
                                <td className="p-2">
                                  <Select
                                    value={editingShortage.status}
                                    onValueChange={(value: "critical" | "moderate" | "resolved") =>
                                      setEditingShortage({ ...editingShortage, status: value })
                                    }
                                  >
                                    <SelectTrigger className="w-full" dir="rtl">
                                      <SelectValue placeholder="اختر الحالة" />
                                    </SelectTrigger>
                                    <SelectContent dir="rtl">
                                      <SelectItem value="critical">حرجة</SelectItem>
                                      <SelectItem value="moderate">متوسطة</SelectItem>
                                      <SelectItem value="resolved">تم حلها</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </td>
                                <td className="p-2 text-sm text-gray-600">
                                  {new Date(shortage.reportDate).toLocaleDateString("ar-EG")}
                                </td>
                                <td className="p-2 text-sm text-gray-600">
                                  {new Date(shortage.lastUpdateDate).toLocaleDateString("ar-EG")}
                                </td>
                                <td className="p-2">
                                  <div className="flex gap-0.5 justify-center">
                                    <Button
                                      onClick={handleSaveShortageEdit}
                                      size="icon"
                                      className="h-7 w-7 bg-green-600 hover:bg-green-700"
                                    >
                                      <Save className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      onClick={() => setEditingShortage(null)}
                                      size="icon"
                                      className="h-7 w-7"
                                      variant="outline"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="p-2 font-medium text-blue-600" dir="rtl">
                                  {shortage.drugName}
                                </td>
                                <td className="p-2 text-gray-700" dir="rtl">
                                  {shortage.reason}
                                </td>
                                <td className="p-2">
                                  <Badge
                                    variant="outline"
                                    className={
                                      shortage.status === "critical"
                                        ? "bg-red-50 text-red-600 border-red-200"
                                        : shortage.status === "moderate"
                                          ? "bg-orange-50 text-orange-600 border-orange-200"
                                          : "bg-green-50 text-green-600 border-green-200"
                                    }
                                  >
                                    {shortage.status === "critical"
                                      ? "حرجة"
                                      : shortage.status === "moderate"
                                        ? "متوسطة"
                                        : "تم حلها"}
                                  </Badge>
                                </td>
                                <td className="p-2 text-sm text-gray-600">
                                  {new Date(shortage.reportDate).toLocaleDateString("ar-EG")}
                                </td>
                                <td className="p-2 text-sm text-gray-600">
                                  {new Date(shortage.lastUpdateDate).toLocaleDateString("ar-EG")}
                                </td>
                                <td className="p-2">
                                  <div className="flex gap-0.5 justify-center">
                                    <Button
                                      onClick={() => handleEditShortage(shortage)}
                                      size="icon"
                                      variant="outline"
                                      className="h-7 w-7 text-blue-600 hover:bg-blue-50"
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      onClick={() => handleDeleteShortage(shortage.id)}
                                      size="icon"
                                      variant="outline"
                                      className="h-7 w-7 text-red-600 hover:bg-red-50"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Data Management Tab */}
        {activeTab === "data" && (
          <>
            {/* Data Management Message */}
            {dataManagementMessage && (
              <Alert
                className={`mb-6 ${dataManagementMessage.type === "success" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}
              >
                <AlertDescription
                  className={`text-sm ${dataManagementMessage.type === "success" ? "text-green-800" : "text-red-800"}`}
                >
                  {dataManagementMessage.text}
                </AlertDescription>
              </Alert>
            )}

            {/* Data Management Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100">إجمالي الأدوية</p>
                      <p className="text-3xl font-bold">{drugs.length}</p>
                    </div>
                    <Database className="h-12 w-12 text-blue-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100">النسخ الاحتياطية</p>
                      <p className="text-3xl font-bold">{backups.length}</p>
                    </div>
                    <FileText className="h-12 w-12 text-green-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100">آخر تحديث</p>
                      <p className="text-sm font-medium">
                        {drugs.length > 0 ? new Date().toLocaleDateString("ar-EG") : "لا يوجد"}
                      </p>
                    </div>
                    <RefreshCw className="h-12 w-12 text-purple-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Import Section */}
            <Card className="mb-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  استيراد البيانات
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Import from File */}
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h3 className="font-semibold mb-3 text-gray-800">استيراد من ملف JSON</h3>
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportFromFile}
                      className="flex-1 p-2 border border-gray-300 rounded-md bg-white"
                      disabled={dataManagementLoading}
                    />
                    <Button
                      onClick={() => document.getElementById('file-input')?.click()}
                      disabled={dataManagementLoading}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {dataManagementLoading ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        "اختيار ملف"
                      )}
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    يجب أن يحتوي الملف على مصفوفة من كائنات الأدوية بصيغة JSON
                  </p>
                </div>

                {/* Import from URL */}
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h3 className="font-semibold mb-3 text-gray-800">استيراد من رابط</h3>
                  <div className="flex items-center gap-4">
                    <Input
                      type="url"
                      placeholder="https://example.com/drugs.json"
                      value={importUrl}
                      onChange={(e) => setImportUrl(e.target.value)}
                      className="flex-1"
                      disabled={dataManagementLoading}
                    />
                    <Button
                      onClick={handleImportFromUrl}
                      disabled={dataManagementLoading || !importUrl.trim()}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {dataManagementLoading ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        "استيراد"
                      )}
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    أدخل رابط يحتوي على بيانات الأدوية بصيغة JSON
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Export and Backup Section */}
            <Card className="mb-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  تصدير البيانات والنسخ الاحتياطية
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Export Current Data */}
                <div className="border rounded-lg p-4 bg-blue-50">
                  <h3 className="font-semibold mb-3 text-blue-800">تصدير البيانات الحالية</h3>
                  <Button
                    onClick={handleExportData}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    تصدير البيانات
                  </Button>
                  <p className="text-sm text-blue-600 mt-2">
                    تحميل جميع بيانات الأدوية الحالية كملف JSON
                  </p>
                </div>

                {/* Restore from Backup */}
                <div className="border rounded-lg p-4 bg-green-50">
                  <h3 className="font-semibold mb-3 text-green-800">استعادة من نسخة احتياطية</h3>
                  <div className="flex items-center gap-4 mb-3">
                    <Select value={selectedBackup} onValueChange={setSelectedBackup}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="اختر نسخة احتياطية" />
                      </SelectTrigger>
                      <SelectContent>
                        {backups.map((backup) => (
                          <SelectItem key={backup} value={backup}>
                            {new Date(Number(backup)).toLocaleString("ar-EG")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={handleRestoreData}
                      disabled={!selectedBackup || dataManagementLoading}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {dataManagementLoading ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        "استعادة"
                      )}
                    </Button>
                  </div>
                  <p className="text-sm text-green-600">
                    استعادة البيانات من نسخة احتياطية سابقة
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="mb-6 shadow-lg border-0 bg-red-50 border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-800">
                  <AlertTriangle className="h-5 w-5" />
                  منطقة الخطر
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border border-red-300 rounded-lg p-4 bg-red-100">
                  <h3 className="font-semibold mb-3 text-red-800">حذف جميع البيانات</h3>
                  <p className="text-sm text-red-700 mb-4">
                    تحذير: هذا الإجراء سيحذف جميع بيانات الأدوية من قاعدة البيانات. 
                    سيتم إنشاء نسخة احتياطية تلقائياً قبل الحذف.
                  </p>
                  <Button
                    onClick={handleDeleteAllData}
                    disabled={dataManagementLoading}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {dataManagementLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      "حذف جميع البيانات"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Logs Navigation */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  سجلات الموقع
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  عرض سجلات جميع العمليات والإجراءات التي تمت على الموقع
                </p>
                <Link href="/admin-panel-secure/logs">
                  <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                    <Activity className="h-4 w-4 mr-2" />
                    عرض السجلات
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
