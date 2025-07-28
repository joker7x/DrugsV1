interface LocalDrug {
  id: string
  name: string
  newPrice: number
  oldPrice: number
  no: string
  updateDate: string
  activeIngredient?: string
  averageDiscountPercent?: number
}

interface LocalShortage {
  id: string
  drugName: string
  reason: string
  status: "critical" | "moderate" | "resolved"
  reportDate: string
  lastUpdateDate: string
}

interface LocalData {
  drugs: LocalDrug[]
  shortages: LocalShortage[]
  lastUpdated: string
  version: string
}

const LOCAL_STORAGE_KEY = "local_drugs_data"
const DATA_VERSION = "1.0.0"

export const localDataManager = {
  // Save data to local storage
  saveData: (data: LocalData) => {
    try {
      const dataToSave = {
        ...data,
        version: DATA_VERSION,
        lastUpdated: new Date().toISOString(),
      }
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToSave))
      return true
    } catch (error) {
      console.error("Failed to save local data:", error)
      return false
    }
  },

  // Load data from local storage
  loadData: (): LocalData | null => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (!stored) return null

      const data: LocalData = JSON.parse(stored)
      
      // Validate data structure
      if (!data.drugs || !Array.isArray(data.drugs)) {
        console.warn("Invalid local data structure")
        return null
      }

      return data
    } catch (error) {
      console.error("Failed to load local data:", error)
      return null
    }
  },

  // Save drugs to local storage
  saveDrugs: (drugs: LocalDrug[]) => {
    try {
      console.log("Saving drugs to local storage:", drugs.length)
      const currentData = localDataManager.loadData() || { drugs: [], shortages: [], lastUpdated: "", version: DATA_VERSION }
      const updatedData: LocalData = {
        ...currentData,
        drugs,
        lastUpdated: new Date().toISOString(),
      }
      const result = localDataManager.saveData(updatedData)
      console.log("Save drugs result:", result)
      return result
    } catch (error) {
      console.error("Failed to save drugs:", error)
      return false
    }
  },

  // Save shortages to local storage
  saveShortages: (shortages: LocalShortage[]) => {
    try {
      const currentData = localDataManager.loadData() || { drugs: [], shortages: [], lastUpdated: "", version: DATA_VERSION }
      const updatedData: LocalData = {
        ...currentData,
        shortages,
        lastUpdated: new Date().toISOString(),
      }
      return localDataManager.saveData(updatedData)
    } catch (error) {
      console.error("Failed to save shortages:", error)
      return false
    }
  },

  // Get drugs from local storage
  getDrugs: (): LocalDrug[] => {
    const data = localDataManager.loadData()
    return data?.drugs || []
  },

  // Get shortages from local storage
  getShortages: (): LocalShortage[] => {
    const data = localDataManager.loadData()
    return data?.shortages || []
  },

  // Add a single drug
  addDrug: (drug: LocalDrug) => {
    try {
      const drugs = localDataManager.getDrugs()
      const updatedDrugs = [...drugs, drug]
      return localDataManager.saveDrugs(updatedDrugs)
    } catch (error) {
      console.error("Failed to add drug:", error)
      return false
    }
  },

  // Update a single drug
  updateDrug: (drugId: string, updatedDrug: LocalDrug) => {
    try {
      const drugs = localDataManager.getDrugs()
      const updatedDrugs = drugs.map(drug => 
        drug.id === drugId ? { ...drug, ...updatedDrug } : drug
      )
      return localDataManager.saveDrugs(updatedDrugs)
    } catch (error) {
      console.error("Failed to update drug:", error)
      return false
    }
  },

  // Delete a single drug
  deleteDrug: (drugId: string) => {
    try {
      const drugs = localDataManager.getDrugs()
      const updatedDrugs = drugs.filter(drug => drug.id !== drugId)
      return localDataManager.saveDrugs(updatedDrugs)
    } catch (error) {
      console.error("Failed to delete drug:", error)
      return false
    }
  },

  // Add a single shortage
  addShortage: (shortage: LocalShortage) => {
    try {
      const shortages = localDataManager.getShortages()
      const updatedShortages = [...shortages, shortage]
      return localDataManager.saveShortages(updatedShortages)
    } catch (error) {
      console.error("Failed to add shortage:", error)
      return false
    }
  },

  // Update a single shortage
  updateShortage: (shortageId: string, updatedShortage: LocalShortage) => {
    try {
      const shortages = localDataManager.getShortages()
      const updatedShortages = shortages.map(shortage => 
        shortage.id === shortageId ? { ...shortage, ...updatedShortage } : shortage
      )
      return localDataManager.saveShortages(updatedShortages)
    } catch (error) {
      console.error("Failed to update shortage:", error)
      return false
    }
  },

  // Delete a single shortage
  deleteShortage: (shortageId: string) => {
    try {
      const shortages = localDataManager.getShortages()
      const updatedShortages = shortages.filter(shortage => shortage.id !== shortageId)
      return localDataManager.saveShortages(updatedShortages)
    } catch (error) {
      console.error("Failed to delete shortage:", error)
      return false
    }
  },

  // Clear all data
  clearAllData: () => {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY)
      return true
    } catch (error) {
      console.error("Failed to clear data:", error)
      return false
    }
  },

  // Export data
  exportData: () => {
    const data = localDataManager.loadData()
    if (!data) return null

    const exportData = {
      ...data,
      exportDate: new Date().toISOString(),
      totalDrugs: data.drugs.length,
      totalShortages: data.shortages.length,
    }

    return exportData
  },

  // Import data
  importData: (importedData: any) => {
    try {
      if (!importedData.drugs || !Array.isArray(importedData.drugs)) {
        throw new Error("Invalid data format")
      }

      const data: LocalData = {
        drugs: importedData.drugs,
        shortages: importedData.shortages || [],
        lastUpdated: new Date().toISOString(),
        version: DATA_VERSION,
      }

      return localDataManager.saveData(data)
    } catch (error) {
      console.error("Failed to import data:", error)
      return false
    }
  },

  // Get data statistics
  getStats: () => {
    const data = localDataManager.loadData()
    if (!data) return null

    return {
      totalDrugs: data.drugs.length,
      totalShortages: data.shortages.length,
      lastUpdated: data.lastUpdated,
      version: data.version,
    }
  },
}