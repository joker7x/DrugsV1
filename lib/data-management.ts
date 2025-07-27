interface LogEntry {
  id: string
  timestamp: number
  action: string
  details: string
  adminEmail: string
}

interface ImportResult {
  success: boolean
  message: string
  importedCount?: number
  errors?: string[]
}

const FIREBASE_BASE_URL = "https://dwalast-default-rtdb.firebaseio.com"

export const dataManager = {
  // Import data from file
  importFromFile: async (file: File, adminEmail: string): Promise<ImportResult> => {
    try {
      const text = await file.text()
      let data: any

      // Try to parse as JSON
      try {
        data = JSON.parse(text)
      } catch {
        return {
          success: false,
          message: "Invalid JSON format in file"
        }
      }

      // Validate data structure
      if (!Array.isArray(data) || data.length === 0) {
        return {
          success: false,
          message: "File must contain an array of drug objects"
        }
      }

      // Validate each drug object
      const validDrugs = []
      const errors = []

      for (let i = 0; i < data.length; i++) {
        const drug = data[i]
        if (!drug.name || typeof drug.name !== 'string') {
          errors.push(`Row ${i + 1}: Missing or invalid name`)
          continue
        }
        if (!drug.newPrice || isNaN(Number(drug.newPrice))) {
          errors.push(`Row ${i + 1}: Missing or invalid newPrice`)
          continue
        }
        if (!drug.oldPrice || isNaN(Number(drug.oldPrice))) {
          errors.push(`Row ${i + 1}: Missing or invalid oldPrice`)
          continue
        }
        if (!drug.no || typeof drug.no !== 'string') {
          errors.push(`Row ${i + 1}: Missing or invalid no`)
          continue
        }

        // Process the drug
        const processedDrug = {
          id: `drug_${Date.now()}_${i}`,
          name: drug.name.trim(),
          newPrice: Number(drug.newPrice),
          oldPrice: Number(drug.oldPrice),
          no: drug.no.trim(),
          updateDate: drug.updateDate || new Date().toISOString().split('T')[0],
          priceChange: Number(drug.newPrice) - Number(drug.oldPrice),
          priceChangePercent: ((Number(drug.newPrice) - Number(drug.oldPrice)) / Number(drug.oldPrice)) * 100,
          originalOrder: i,
          activeIngredient: drug.activeIngredient || undefined,
          averageDiscountPercent: drug.averageDiscountPercent || undefined
        }

        validDrugs.push(processedDrug)
      }

      if (validDrugs.length === 0) {
        return {
          success: false,
          message: "No valid drugs found in file",
          errors
        }
      }

      // Save to Firebase
      const response = await fetch(`${FIREBASE_BASE_URL}/drugs.json`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validDrugs)
      })

      if (!response.ok) {
        throw new Error(`Failed to save to Firebase: ${response.statusText}`)
      }

      // Update last modified date
      await fetch(`${FIREBASE_BASE_URL}/drugs/updateDate.json`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(new Date().toISOString())
      })

      // Log the import
      await dataManager.logAction(adminEmail, 'import_from_file', `Imported ${validDrugs.length} drugs from file: ${file.name}`)

      return {
        success: true,
        message: `Successfully imported ${validDrugs.length} drugs`,
        importedCount: validDrugs.length,
        errors: errors.length > 0 ? errors : undefined
      }

    } catch (error) {
      console.error('Import error:', error)
      return {
        success: false,
        message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  },

  // Import data from URL
  importFromUrl: async (url: string, adminEmail: string): Promise<ImportResult> => {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`)
      }

      const data = await response.json()

      // Validate data structure
      if (!Array.isArray(data) || data.length === 0) {
        return {
          success: false,
          message: "URL must return an array of drug objects"
        }
      }

      // Process and validate drugs (same logic as file import)
      const validDrugs = []
      const errors = []

      for (let i = 0; i < data.length; i++) {
        const drug = data[i]
        if (!drug.name || typeof drug.name !== 'string') {
          errors.push(`Row ${i + 1}: Missing or invalid name`)
          continue
        }
        if (!drug.newPrice || isNaN(Number(drug.newPrice))) {
          errors.push(`Row ${i + 1}: Missing or invalid newPrice`)
          continue
        }
        if (!drug.oldPrice || isNaN(Number(drug.oldPrice))) {
          errors.push(`Row ${i + 1}: Missing or invalid oldPrice`)
          continue
        }
        if (!drug.no || typeof drug.no !== 'string') {
          errors.push(`Row ${i + 1}: Missing or invalid no`)
          continue
        }

        const processedDrug = {
          id: `drug_${Date.now()}_${i}`,
          name: drug.name.trim(),
          newPrice: Number(drug.newPrice),
          oldPrice: Number(drug.oldPrice),
          no: drug.no.trim(),
          updateDate: drug.updateDate || new Date().toISOString().split('T')[0],
          priceChange: Number(drug.newPrice) - Number(drug.oldPrice),
          priceChangePercent: ((Number(drug.newPrice) - Number(drug.oldPrice)) / Number(drug.oldPrice)) * 100,
          originalOrder: i,
          activeIngredient: drug.activeIngredient || undefined,
          averageDiscountPercent: drug.averageDiscountPercent || undefined
        }

        validDrugs.push(processedDrug)
      }

      if (validDrugs.length === 0) {
        return {
          success: false,
          message: "No valid drugs found in URL data",
          errors
        }
      }

      // Save to Firebase
      const saveResponse = await fetch(`${FIREBASE_BASE_URL}/drugs.json`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validDrugs)
      })

      if (!saveResponse.ok) {
        throw new Error(`Failed to save to Firebase: ${saveResponse.statusText}`)
      }

      // Update last modified date
      await fetch(`${FIREBASE_BASE_URL}/drugs/updateDate.json`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(new Date().toISOString())
      })

      // Log the import
      await dataManager.logAction(adminEmail, 'import_from_url', `Imported ${validDrugs.length} drugs from URL: ${url}`)

      return {
        success: true,
        message: `Successfully imported ${validDrugs.length} drugs from URL`,
        importedCount: validDrugs.length,
        errors: errors.length > 0 ? errors : undefined
      }

    } catch (error) {
      console.error('Import from URL error:', error)
      return {
        success: false,
        message: `Import from URL failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  },

  // Export current data
  exportData: async (): Promise<string> => {
    try {
      const response = await fetch(`${FIREBASE_BASE_URL}/drugs.json`)
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`)
      }

      const data = await response.json()
      return JSON.stringify(data, null, 2)
    } catch (error) {
      console.error('Export error:', error)
      throw error
    }
  },

  // Delete all data
  deleteAllData: async (adminEmail: string): Promise<boolean> => {
    try {
      // First, backup current data
      const currentData = await dataManager.exportData()
      
      // Save backup
      await fetch(`${FIREBASE_BASE_URL}/backups/${Date.now()}.json`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: currentData
      })

      // Delete all drugs
      const response = await fetch(`${FIREBASE_BASE_URL}/drugs.json`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error(`Failed to delete data: ${response.statusText}`)
      }

      // Log the deletion
      await dataManager.logAction(adminEmail, 'delete_all_data', 'Deleted all drug data')

      return true
    } catch (error) {
      console.error('Delete all data error:', error)
      return false
    }
  },

  // Restore data from backup
  restoreData: async (backupId: string, adminEmail: string): Promise<boolean> => {
    try {
      const response = await fetch(`${FIREBASE_BASE_URL}/backups/${backupId}.json`)
      if (!response.ok) {
        throw new Error(`Failed to fetch backup: ${response.statusText}`)
      }

      const backupData = await response.json()

      // Restore the data
      const restoreResponse = await fetch(`${FIREBASE_BASE_URL}/drugs.json`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(backupData)
      })

      if (!restoreResponse.ok) {
        throw new Error(`Failed to restore data: ${restoreResponse.statusText}`)
      }

      // Log the restoration
      await dataManager.logAction(adminEmail, 'restore_data', `Restored data from backup: ${backupId}`)

      return true
    } catch (error) {
      console.error('Restore data error:', error)
      return false
    }
  },

  // Get available backups
  getBackups: async (): Promise<string[]> => {
    try {
      const response = await fetch(`${FIREBASE_BASE_URL}/backups.json`)
      if (!response.ok) {
        return []
      }

      const data = await response.json()
      return Object.keys(data || {}).sort((a, b) => Number(b) - Number(a))
    } catch (error) {
      console.error('Get backups error:', error)
      return []
    }
  },

  // Log actions
  logAction: async (adminEmail: string, action: string, details: string): Promise<void> => {
    try {
      const logEntry: LogEntry = {
        id: `log_${Date.now()}`,
        timestamp: Date.now(),
        action,
        details,
        adminEmail
      }

      await fetch(`${FIREBASE_BASE_URL}/logs/${logEntry.id}.json`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logEntry)
      })
    } catch (error) {
      console.error('Log action error:', error)
    }
  },

  // Get logs
  getLogs: async (): Promise<LogEntry[]> => {
    try {
      const response = await fetch(`${FIREBASE_BASE_URL}/logs.json?orderBy="timestamp"&limitToLast=100`)
      if (!response.ok) {
        return []
      }

      const data = await response.json()
      if (!data) return []

      const logs = Object.values(data) as LogEntry[]
      return logs.sort((a, b) => b.timestamp - a.timestamp)
    } catch (error) {
      console.error('Get logs error:', error)
      return []
    }
  }
}