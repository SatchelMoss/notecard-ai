import ConfigSidebar from '@/components/config/ConfigSidebar'
import NotecardEditor from '@/components/editor/NotecardEditor'
import UploadPanel from '@/components/upload/UploadPanel'
import PriorityPanel from '@/components/upload/PriorityPanel'
import AnalyzeButton from '@/components/upload/AnalyzeButton'
import PrintButton from '@/components/print/PrintButton'

export default function Home() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left sidebar — card config */}
      <ConfigSidebar />

      {/* Center — editor */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-gray-800 bg-gray-900 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight">NoteCard AI</span>
            <span className="text-xs text-gray-500 bg-gray-800 rounded px-2 py-0.5">beta</span>
          </div>
          <PrintButton />
        </header>

        {/* Editor canvas */}
        <NotecardEditor />
      </main>

      {/* Right sidebar — upload + AI */}
      <aside className="w-72 shrink-0 bg-gray-900 border-l border-gray-700 p-5 flex flex-col gap-6 overflow-y-auto">
        <UploadPanel />
        <div className="border-t border-gray-700 pt-4">
          <PriorityPanel />
        </div>
        <div className="border-t border-gray-700 pt-4">
          <AnalyzeButton />
        </div>
      </aside>
    </div>
  )
}
