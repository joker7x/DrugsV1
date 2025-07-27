const ADMIN_CREDENTIALS = {
  email: "wagihm62@gmail.com",
  password: "Mm20202029@#",
}

const AUTH_KEY = "admin_auth"
const AUTH_DURATION = 24 * 60 * 60 * 1000 // 24 hours

export const authManager = {
  login: (email: string, password: string): boolean => {
    if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
      const authData = {
        isAuthenticated: true,
        timestamp: Date.now(),
      }
      try {
        localStorage.setItem(AUTH_KEY, JSON.stringify(authData))
        return true
      } catch (error) {
        console.warn("Failed to save auth data:", error)
        return false
      }
    }
    return false
  },

  isAuthenticated: (): boolean => {
    try {
      const authData = localStorage.getItem(AUTH_KEY)
      if (!authData) return false

      const parsed = JSON.parse(authData)
      const isExpired = Date.now() - parsed.timestamp > AUTH_DURATION

      if (isExpired) {
        localStorage.removeItem(AUTH_KEY)
        return false
      }

      return parsed.isAuthenticated
    } catch (error) {
      console.warn("Failed to check auth:", error)
      localStorage.removeItem(AUTH_KEY)
      return false
    }
  },

  logout: () => {
    try {
      localStorage.removeItem(AUTH_KEY)
    } catch (error) {
      console.warn("Failed to logout:", error)
    }
  },

  getCurrentUser: (): string | null => {
    try {
      const authData = localStorage.getItem(AUTH_KEY)
      if (!authData) return null

      const parsed = JSON.parse(authData)
      const isExpired = Date.now() - parsed.timestamp > AUTH_DURATION

      if (isExpired) {
        localStorage.removeItem(AUTH_KEY)
        return null
      }

      return parsed.isAuthenticated ? ADMIN_CREDENTIALS.email : null
    } catch (error) {
      console.warn("Failed to get current user:", error)
      return null
    }
  },
}
