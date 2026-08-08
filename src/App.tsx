import { useEffect, useMemo, useState } from 'react'
import { loadReports, saveReports } from './storage'
import type { Report } from './types'
import './App.css'

function createReport(): Report {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    title: 'Untitled report',
    content: '# New report\n\nStart writing your report here.',
    updatedAt: now,
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString()
}

function App() {
  const [reports, setReports] = useState<Report[]>(() => loadReports())
  const [selectedId, setSelectedId] = useState<string | null>(
    () => loadReports()[0]?.id ?? null,
  )

  const selectedReport = useMemo(
    () => reports.find((report) => report.id === selectedId) ?? null,
    [reports, selectedId],
  )

  useEffect(() => {
    saveReports(reports)
  }, [reports])

  function handleCreate() {
    const report = createReport()
    setReports((current) => [report, ...current])
    setSelectedId(report.id)
  }

  function handleDelete(id: string) {
    setReports((current) => {
      const next = current.filter((report) => report.id !== id)
      if (selectedId === id) {
        setSelectedId(next[0]?.id ?? null)
      }
      return next
    })
  }

  function updateSelected(patch: Partial<Pick<Report, 'title' | 'content'>>) {
    if (!selectedId) return
    setReports((current) =>
      current.map((report) =>
        report.id === selectedId
          ? { ...report, ...patch, updatedAt: new Date().toISOString() }
          : report,
      ),
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Report Editor</h1>
          <p>Create, edit, and manage markdown reports locally.</p>
        </div>
        <button type="button" className="primary" onClick={handleCreate}>
          New report
        </button>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <h2>Reports</h2>
          {reports.length === 0 ? (
            <p className="empty">No reports yet. Create one to get started.</p>
          ) : (
            <ul className="report-list">
              {reports.map((report) => (
                <li key={report.id}>
                  <button
                    type="button"
                    className={
                      report.id === selectedId ? 'report-item active' : 'report-item'
                    }
                    onClick={() => setSelectedId(report.id)}
                  >
                    <span className="report-title">{report.title}</span>
                    <span className="report-meta">{formatDate(report.updatedAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <main className="editor-pane">
          {selectedReport ? (
            <>
              <div className="editor-toolbar">
                <input
                  className="title-input"
                  value={selectedReport.title}
                  onChange={(event) => updateSelected({ title: event.target.value })}
                  aria-label="Report title"
                />
                <button
                  type="button"
                  className="danger"
                  onClick={() => handleDelete(selectedReport.id)}
                >
                  Delete
                </button>
              </div>

              <div className="editor-grid">
                <section className="panel">
                  <h3>Markdown</h3>
                  <textarea
                    className="content-input"
                    value={selectedReport.content}
                    onChange={(event) =>
                      updateSelected({ content: event.target.value })
                    }
                    aria-label="Report content"
                  />
                </section>

                <section className="panel preview-panel">
                  <h3>Preview</h3>
                  <div className="preview">
                    {selectedReport.content.split('\n').map((line, index) => {
                      if (line.startsWith('# ')) {
                        return <h1 key={index}>{line.slice(2)}</h1>
                      }
                      if (line.startsWith('## ')) {
                        return <h2 key={index}>{line.slice(3)}</h2>
                      }
                      if (line.startsWith('- ')) {
                        return <li key={index}>{line.slice(2)}</li>
                      }
                      if (line.trim() === '') {
                        return <br key={index} />
                      }
                      return <p key={index}>{line}</p>
                    })}
                  </div>
                </section>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <h2>Welcome</h2>
              <p>Select a report or create a new one to begin editing.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
