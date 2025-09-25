import React from 'react'
import SplitLayout from './components/layout/SplitLayout'
import ControlPanel from './components/panels/ControlPanel'
import CanvasKitPanel from './components/panels/CanvasKitPanel'
import { AppProvider } from './context'

export default function App() {
  return (
    <AppProvider>
      {/* 两列：左 32% / 右 68%，最小像素分别 260 / 480 */}
      <SplitLayout columns={[32, 68]} minPx={[260, 480]}>
        {[ <ControlPanel key="left" />, <CanvasKitPanel key="right" /> ]}
      </SplitLayout>
    </AppProvider>
  )
}
