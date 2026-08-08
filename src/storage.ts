import type { Report } from './types'

const STORAGE_KEY = 'report-editor-reports'

export function loadReports(): Report[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Report[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveReports(reports: Report[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports))
}
