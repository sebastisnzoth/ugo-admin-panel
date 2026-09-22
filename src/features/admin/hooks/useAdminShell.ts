import { useEffect, useState } from 'react'
import { getAdminOverview, type AdminOverview } from '../services/adminService'

export function useAdminShell() {
  const [data, setData] = useState<AdminOverview | null>(null)

  useEffect(() => {
    void getAdminOverview().then(setData)
  }, [])

  return { data }
}
