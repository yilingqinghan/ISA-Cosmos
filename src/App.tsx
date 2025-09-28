import React from 'react'
import SplitLayout from './components/layout/SplitLayout'
import LeftPanel from './components/panels/LeftPanel'
import CanvasKitPanel from './components/panels/CanvasKitPanel'
import { AppProvider } from './context'

export default function App(){
  return (
    <AppProvider>
      <div className="app-shell">
        <main className="app-main" style={{ overflow: 'hidden' }}>
          <div className="container page-main">
            <div className="split-host">
              <SplitLayout columns={[36, 64]} minPx={[320, 520]}>
                {[ <LeftPanel key="left"/>, <CanvasKitPanel key="right"/> ]}
              </SplitLayout>
            </div>
          </div>
        </main>
      </div>
    </AppProvider>
  )
}
