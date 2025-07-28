import { localDataManager } from "./local-data"

export interface CommandResult {
  success: boolean
  message: string
  data?: any
}

export const commandManager = {
  // Display site records command
  displaySiteRecords: (): CommandResult => {
    try {
      const localData = localDataManager.loadData()
      if (!localData) {
        return {
          success: false,
          message: "لا توجد بيانات متاحة"
        }
      }

      const stats = localDataManager.getStats()
      const drugs = localData.drugs
      const shortages = localData.shortages

      // Calculate statistics
      const totalDrugs = drugs.length
      const totalShortages = shortages.length
      const criticalShortages = shortages.filter(s => s.status === "critical").length
      const averagePrice = drugs.length > 0 
        ? drugs.reduce((sum, drug) => sum + drug.newPrice, 0) / drugs.length 
        : 0

      const priceChanges = drugs.map(drug => drug.newPrice - drug.oldPrice)
      const priceIncreases = priceChanges.filter(change => change > 0).length
      const priceDecreases = priceChanges.filter(change => change < 0).length

      const today = new Date().toLocaleDateString("ar-EG")
      const updatedToday = drugs.filter(drug => drug.updateDate === today).length

      const result = {
        totalDrugs,
        totalShortages,
        criticalShortages,
        averagePrice: averagePrice.toFixed(2),
        priceIncreases,
        priceDecreases,
        updatedToday,
        lastUpdated: stats?.lastUpdated ? new Date(stats.lastUpdated).toLocaleDateString("ar-EG") : "غير محدد",
        version: stats?.version || "غير محدد"
      }

      return {
        success: true,
        message: "تم جلب سجلات الموقع بنجاح",
        data: result
      }
    } catch (error) {
      return {
        success: false,
        message: "فشل في جلب سجلات الموقع"
      }
    }
  },

  // Export data command
  exportData: (): CommandResult => {
    try {
      const exportData = localDataManager.exportData()
      if (!exportData) {
        return {
          success: false,
          message: "لا توجد بيانات للتصدير"
        }
      }

      return {
        success: true,
        message: "تم تصدير البيانات بنجاح",
        data: exportData
      }
    } catch (error) {
      return {
        success: false,
        message: "فشل في تصدير البيانات"
      }
    }
  },

  // Clear data command
  clearData: (): CommandResult => {
    try {
      const success = localDataManager.clearAllData()
      if (success) {
        return {
          success: true,
          message: "تم مسح جميع البيانات بنجاح"
        }
      } else {
        return {
          success: false,
          message: "فشل في مسح البيانات"
        }
      }
    } catch (error) {
      return {
        success: false,
        message: "فشل في مسح البيانات"
      }
    }
  },

  // Get system info command
  getSystemInfo: (): CommandResult => {
    try {
      const stats = localDataManager.getStats()
      if (!stats) {
        return {
          success: false,
          message: "لا توجد معلومات متاحة"
        }
      }

      return {
        success: true,
        message: "تم جلب معلومات النظام بنجاح",
        data: {
          version: stats.version,
          lastUpdated: stats.lastUpdated ? new Date(stats.lastUpdated).toLocaleDateString("ar-EG") : "غير محدد",
          totalDrugs: stats.totalDrugs,
          totalShortages: stats.totalShortages,
          securityStatus: "مؤمن",
          cacheStatus: "نشط"
        }
      }
    } catch (error) {
      return {
        success: false,
        message: "فشل في جلب معلومات النظام"
      }
    }
  },

  // Backup data command
  backupData: (): CommandResult => {
    try {
      const backupData = localDataManager.exportData()
      if (!backupData) {
        return {
          success: false,
          message: "لا توجد بيانات للنسخ الاحتياطي"
        }
      }

      const enhancedBackup = {
        ...backupData,
        backupDate: new Date().toISOString(),
        backupType: "full",
        systemInfo: {
          userAgent: navigator.userAgent,
          timestamp: Date.now(),
          version: backupData.version
        }
      }

      return {
        success: true,
        message: "تم إنشاء نسخة احتياطية بنجاح",
        data: enhancedBackup
      }
    } catch (error) {
      return {
        success: false,
        message: "فشل في إنشاء النسخة الاحتياطية"
      }
    }
  }
}

// Command execution function
export const executeCommand = (command: string, args?: any): CommandResult => {
  switch (command.toLowerCase()) {
    case "display-records":
    case "show-records":
    case "records":
      return commandManager.displaySiteRecords()
    
    case "export":
    case "export-data":
      return commandManager.exportData()
    
    case "clear":
    case "clear-data":
      return commandManager.clearData()
    
    case "system-info":
    case "info":
      return commandManager.getSystemInfo()
    
    case "backup":
    case "backup-data":
      return commandManager.backupData()
    
    default:
      return {
        success: false,
        message: `الأمر "${command}" غير معروف. الأوامر المتاحة: display-records, export, clear, system-info, backup`
      }
  }
}